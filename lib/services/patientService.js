const supabaseAdmin = require('../supabaseAdmin');
const { validateRut } = require('../utils/rutValidator');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, AuthorizationError, AppError } = require('../errors');

/**
 * Campos del perfil de paciente a seleccionar.
 */
const PATIENT_PROFILE_FIELDS = 'id, user_id, first_name, last_name, rut, email, phone, birth_date, gender, address, city, insurance, created_at, updated_at';

/**
 * Crea un nuevo paciente y establece la relación doctor-paciente.
 * @param {string} doctorId - UUID del doctor que crea el paciente
 * @param {Object} data - Datos del paciente (first_name, last_name, rut, email, phone, birth_date, gender, address, city, insurance)
 * @returns {Promise<Object>} Datos del paciente creado
 * @throws {AppError} Si el RUT es inválido
 */
async function create(doctorId, data) {
  // Validar RUT
  if (!validateRut(data.rut)) {
    throw new AppError('El RUT proporcionado no es válido', 400, 'INVALID_RUT');
  }

  // Insertar en patients_profile
  const { data: patient, error: insertError } = await supabaseAdmin
    .from('patients_profile')
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      rut: data.rut,
      email: data.email || null,
      phone: data.phone || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      address: data.address || null,
      city: data.city || null,
      insurance: data.insurance || null,
    })
    .select(PATIENT_PROFILE_FIELDS)
    .single();

  if (insertError) {
    throw insertError;
  }

  // Crear relación doctor-paciente
  const { error: relationError } = await supabaseAdmin
    .from('doctor_patient')
    .insert({
      doctor_id: doctorId,
      patient_id: patient.id,
    });

  if (relationError) {
    throw relationError;
  }

  return patient;
}

/**
 * Lista los pacientes de un doctor con paginación.
 * Solo retorna pacientes con relación de atención activa.
 * @param {string} doctorId - UUID del doctor
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Registros por página
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function list(doctorId, page, limit) {
  const { from, to, page: currentPage, limit: currentLimit } = paginate(page, limit);

  // Obtener total de pacientes del doctor
  const { count, error: countError } = await supabaseAdmin
    .from('doctor_patient')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', doctorId);

  if (countError) {
    throw countError;
  }

  // Obtener IDs de pacientes del doctor con paginación
  const { data: relations, error: relError } = await supabaseAdmin
    .from('doctor_patient')
    .select('patient_id')
    .eq('doctor_id', doctorId)
    .range(from, to);

  if (relError) {
    throw relError;
  }

  if (!relations || relations.length === 0) {
    const pagination = buildPaginationMeta(count, currentPage, currentLimit);
    return { data: [], pagination };
  }

  const patientIds = relations.map((r) => r.patient_id);

  // Obtener perfiles de los pacientes
  const { data: patients, error: patientsError } = await supabaseAdmin
    .from('patients_profile')
    .select(PATIENT_PROFILE_FIELDS)
    .in('id', patientIds)
    .order('created_at', { ascending: false });

  if (patientsError) {
    throw patientsError;
  }

  const pagination = buildPaginationMeta(count, currentPage, currentLimit);

  return { data: patients || [], pagination };
}

/**
 * Obtiene un paciente por su ID, verificando la relación de atención con el doctor.
 * @param {string} patientId - UUID del paciente
 * @param {string} doctorId - UUID del doctor solicitante
 * @returns {Promise<Object>} Datos del paciente
 * @throws {NotFoundError} Si el paciente no existe
 * @throws {AuthorizationError} Si el doctor no tiene relación de atención con el paciente
 */
async function getById(patientId, doctorId) {
  // Verificar que existe relación doctor-paciente
  const { data: relation, error: relError } = await supabaseAdmin
    .from('doctor_patient')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .single();

  if (relError || !relation) {
    throw new AuthorizationError('No tiene relación de atención con este paciente');
  }

  // Obtener perfil del paciente
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients_profile')
    .select(PATIENT_PROFILE_FIELDS)
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    throw new NotFoundError('Paciente');
  }

  return patient;
}

/**
 * Actualiza los datos de un paciente, verificando la relación de atención.
 * @param {string} patientId - UUID del paciente
 * @param {string} doctorId - UUID del doctor solicitante
 * @param {Object} data - Campos a actualizar
 * @returns {Promise<Object>} Datos actualizados del paciente
 * @throws {AuthorizationError} Si el doctor no tiene relación de atención con el paciente
 * @throws {NotFoundError} Si el paciente no existe
 * @throws {AppError} Si el RUT proporcionado no es válido
 */
async function update(patientId, doctorId, data) {
  // Verificar relación doctor-paciente
  const { data: relation, error: relError } = await supabaseAdmin
    .from('doctor_patient')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .single();

  if (relError || !relation) {
    throw new AuthorizationError('No tiene relación de atención con este paciente');
  }

  // Validar RUT si se proporciona
  if (data.rut) {
    if (!validateRut(data.rut)) {
      throw new AppError('El RUT proporcionado no es válido', 400, 'INVALID_RUT');
    }
  }

  // Filtrar campos permitidos para actualización
  const allowedFields = ['first_name', 'last_name', 'rut', 'email', 'phone', 'birth_date', 'gender', 'address', 'city', 'insurance'];
  const filteredData = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      filteredData[field] = data[field];
    }
  }

  filteredData.updated_at = new Date().toISOString();

  const { data: patient, error: updateError } = await supabaseAdmin
    .from('patients_profile')
    .update(filteredData)
    .eq('id', patientId)
    .select(PATIENT_PROFILE_FIELDS)
    .single();

  if (updateError || !patient) {
    throw new NotFoundError('Paciente');
  }

  return patient;
}

module.exports = {
  create,
  list,
  getById,
  update,
};
