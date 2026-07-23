const supabaseAdmin = require('../supabaseAdmin');
const auditService = require('./auditService');
const { NotFoundError, AuthorizationError } = require('../errors');

/**
 * Campos a seleccionar de medical_records.
 */
const MEDICAL_RECORD_FIELDS = 'id, doctor_id, patient_id, appointment_id, diagnosis, clinical_notes, background, created_at, updated_at';

/**
 * Verifica que existe una relación de atención vigente entre un doctor y un paciente.
 * Si no existe y el doctor tiene una cita con el paciente, crea la relación automáticamente.
 * @param {string} doctorId - UUID del doctor
 * @param {string} patientId - UUID del paciente
 * @returns {Promise<boolean>} true si la relación existe o fue creada
 * @throws {AuthorizationError} Si no existe relación de atención y no hay cita vigente
 */
async function verifyDoctorPatientRelationship(doctorId, patientId) {
  const { data: relation, error } = await supabaseAdmin
    .from('doctor_patient')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .single();

  if (error || !relation) {
    // Check if there's an appointment between doctor and patient
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .limit(1)
      .single();

    if (appointment) {
      // Auto-create the relationship
      await supabaseAdmin
        .from('doctor_patient')
        .insert({ doctor_id: doctorId, patient_id: patientId });
      return true;
    }

    throw new AuthorizationError('No tiene relación de atención vigente con este paciente');
  }

  return true;
}

/**
 * Crea un nuevo registro médico (ficha clínica).
 * Verifica relación doctor-paciente antes de crear.
 * Registra el acceso en audit_log.
 *
 * @param {string} doctorId - UUID del doctor que crea el registro
 * @param {Object} data - Datos de la ficha (patient_id, diagnosis, clinical_notes, background)
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<Object>} Registro médico creado
 * @throws {AuthorizationError} Si el doctor no tiene relación de atención con el paciente
 */
async function create(doctorId, data, ipAddress) {
  // Verificar relación de atención vigente (Req 20.3)
  await verifyDoctorPatientRelationship(doctorId, data.patient_id);

  // Insertar registro médico con timestamps (Req 13.5)
  const now = new Date().toISOString();
  const { data: record, error: insertError } = await supabaseAdmin
    .from('medical_records')
    .insert({
      doctor_id: doctorId,
      patient_id: data.patient_id,
      appointment_id: data.appointment_id || null,
      diagnosis: data.diagnosis,
      clinical_notes: data.clinical_notes || null,
      background: data.background || null,
      created_at: now,
      updated_at: now,
    })
    .select(MEDICAL_RECORD_FIELDS)
    .single();

  if (insertError) {
    throw insertError;
  }

  // Registrar acceso clínico en audit_log (Req 20.4)
  await auditService.logClinicalAccess(
    doctorId,
    'CREATE',
    'medical_record',
    record.id,
    ipAddress
  );

  return record;
}

/**
 * Actualiza un registro médico existente.
 * Verifica que el doctor es el autor del registro antes de permitir la actualización.
 * Registra el acceso en audit_log.
 *
 * @param {string} recordId - UUID del registro médico
 * @param {string} doctorId - UUID del doctor solicitante
 * @param {Object} data - Campos a actualizar (diagnosis, clinical_notes, background)
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<Object>} Registro médico actualizado
 * @throws {NotFoundError} Si el registro no existe
 * @throws {AuthorizationError} Si el doctor no es el autor del registro
 */
async function update(recordId, doctorId, data, ipAddress) {
  // Obtener el registro existente para verificar autoría
  const { data: existingRecord, error: fetchError } = await supabaseAdmin
    .from('medical_records')
    .select(MEDICAL_RECORD_FIELDS)
    .eq('id', recordId)
    .single();

  if (fetchError || !existingRecord) {
    throw new NotFoundError('Registro médico');
  }

  // Verificar que el doctor es el autor del registro (Req 13.2)
  if (existingRecord.doctor_id !== doctorId) {
    throw new AuthorizationError('Solo el doctor autor puede actualizar este registro médico');
  }

  // Filtrar campos permitidos para actualización
  const allowedFields = ['diagnosis', 'clinical_notes', 'background'];
  const filteredData = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      filteredData[field] = data[field];
    }
  }

  // Actualizar timestamp de última modificación (Req 13.5)
  filteredData.updated_at = new Date().toISOString();

  const { data: updatedRecord, error: updateError } = await supabaseAdmin
    .from('medical_records')
    .update(filteredData)
    .eq('id', recordId)
    .select(MEDICAL_RECORD_FIELDS)
    .single();

  if (updateError) {
    throw updateError;
  }

  // Registrar acceso clínico en audit_log (Req 20.4)
  await auditService.logClinicalAccess(
    doctorId,
    'UPDATE',
    'medical_record',
    recordId,
    ipAddress
  );

  return updatedRecord;
}

/**
 * Obtiene el historial médico de un paciente para un doctor.
 * Verifica relación de atención vigente antes de retornar datos.
 * Registra el acceso en audit_log.
 *
 * @param {string} patientId - UUID del paciente
 * @param {string} doctorId - UUID del doctor solicitante
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<Array>} Array de registros médicos del paciente
 * @throws {AuthorizationError} Si el doctor no tiene relación de atención con el paciente
 */
async function getByPatient(patientId, doctorId, ipAddress) {
  // Verificar relación de atención vigente (Req 20.3, 20.6)
  await verifyDoctorPatientRelationship(doctorId, patientId);

  // Consultar registros médicos del paciente
  const { data: records, error: queryError } = await supabaseAdmin
    .from('medical_records')
    .select(MEDICAL_RECORD_FIELDS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (queryError) {
    throw queryError;
  }

  // Registrar acceso clínico en audit_log (Req 20.4)
  await auditService.logClinicalAccess(
    doctorId,
    'READ',
    'medical_record',
    null,
    ipAddress
  );

  return records || [];
}

/**
 * Obtiene los registros médicos propios de un paciente.
 * Para pacientes que consultan su propio historial.
 * Registra el acceso en audit_log.
 *
 * @param {string} patientId - UUID del paciente solicitante
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<Array>} Array de registros médicos del paciente
 */
async function getOwn(patientId, ipAddress) {
  // Consultar registros médicos del paciente (Req 13.4)
  const { data: records, error: queryError } = await supabaseAdmin
    .from('medical_records')
    .select(MEDICAL_RECORD_FIELDS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (queryError) {
    throw queryError;
  }

  // Registrar acceso clínico en audit_log (Req 20.4)
  await auditService.logClinicalAccess(
    patientId,
    'READ',
    'medical_record',
    null,
    ipAddress
  );

  return records || [];
}

module.exports = {
  create,
  update,
  getByPatient,
  getOwn,
};
