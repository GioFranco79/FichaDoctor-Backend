const supabaseAdmin = require('../supabaseAdmin');
const pdfService = require('./pdfService');
const auditService = require('./auditService');
const { NotFoundError, AuthorizationError } = require('../errors');

/**
 * Campos a seleccionar de prescriptions.
 */
const PRESCRIPTION_FIELDS = 'id, doctor_id, patient_id, medications, instructions, issue_date, created_at';

/**
 * Crea una nueva receta médica vinculada al doctor y paciente.
 * Registra el acceso clínico en audit_log.
 *
 * @param {string} doctorId - UUID del doctor que emite la receta
 * @param {Object} data - Datos de la receta (patient_id, medications, instructions)
 * @param {string} data.patient_id - UUID del paciente
 * @param {Array} data.medications - Array de medicamentos [{name, dosage, frequency, duration}]
 * @param {string} [data.instructions] - Indicaciones generales
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<Object>} Receta creada
 */
async function create(doctorId, data, ipAddress) {
  const { data: prescription, error: insertError } = await supabaseAdmin
    .from('prescriptions')
    .insert({
      doctor_id: doctorId,
      patient_id: data.patient_id,
      medications: data.medications,
      instructions: data.instructions || null,
      issue_date: new Date().toISOString().split('T')[0],
    })
    .select(PRESCRIPTION_FIELDS)
    .single();

  if (insertError) {
    throw insertError;
  }

  // Registrar acceso clínico en audit_log (Req 20.4)
  await auditService.logClinicalAccess(
    doctorId,
    'CREATE',
    'prescription',
    prescription.id,
    ipAddress
  );

  return prescription;
}

/**
 * Obtiene las recetas médicas de un paciente.
 * Ordenadas por fecha de creación descendente.
 *
 * @param {string} patientId - UUID del paciente
 * @returns {Promise<Array>} Array de recetas del paciente
 */
async function getByPatient(patientId) {
  const { data: prescriptions, error: queryError } = await supabaseAdmin
    .from('prescriptions')
    .select(PRESCRIPTION_FIELDS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (queryError) {
    throw queryError;
  }

  return prescriptions || [];
}

/**
 * Genera un PDF de una receta médica.
 * Verifica ownership: el Doctor debe ser el emisor de la receta,
 * el Paciente debe ser el destinatario de la receta.
 *
 * @param {string} prescriptionId - UUID de la receta
 * @param {Object} user - Usuario solicitante (de req.user)
 * @param {string} user.id - UUID del usuario
 * @param {string} user.role - Rol del usuario ('Doctor' o 'Paciente')
 * @returns {Promise<Buffer>} Buffer con el contenido del PDF
 * @throws {NotFoundError} Si la receta no existe
 * @throws {AuthorizationError} Si el usuario no tiene permiso para acceder a la receta
 */
async function generatePdf(prescriptionId, user) {
  // Obtener la receta
  const { data: prescription, error: fetchError } = await supabaseAdmin
    .from('prescriptions')
    .select(PRESCRIPTION_FIELDS)
    .eq('id', prescriptionId)
    .single();

  if (fetchError || !prescription) {
    throw new NotFoundError('Receta');
  }

  // Verificar ownership según rol (Req 17.2, 17.4)
  if (user.role === 'Doctor' && prescription.doctor_id !== user.id) {
    throw new AuthorizationError('No tiene permiso para acceder a esta receta');
  }

  if (user.role === 'Paciente' && prescription.patient_id !== user.id) {
    throw new AuthorizationError('No tiene permiso para acceder a esta receta');
  }

  // Obtener datos del doctor
  const { data: doctor, error: doctorError } = await supabaseAdmin
    .from('users')
    .select('first_name, last_name')
    .eq('id', prescription.doctor_id)
    .single();

  if (doctorError || !doctor) {
    throw new NotFoundError('Doctor');
  }

  // Obtener datos del paciente
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('users')
    .select('first_name, last_name')
    .eq('id', prescription.patient_id)
    .single();

  if (patientError || !patient) {
    throw new NotFoundError('Paciente');
  }

  // Generar PDF con datos completos
  const pdfBuffer = await pdfService.generatePrescriptionPdf({
    id: prescription.id,
    doctor,
    patient,
    medications: prescription.medications,
    instructions: prescription.instructions,
    issue_date: prescription.issue_date,
  });

  return pdfBuffer;
}

module.exports = {
  create,
  getByPatient,
  generatePdf,
};
