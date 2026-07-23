const supabaseAdmin = require('../supabaseAdmin');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError } = require('../errors');

/**
 * Campos de perfil de usuario a seleccionar (excluyendo fichas médicas).
 * Solo se retornan datos de perfil, nunca datos clínicos.
 */
const USER_PROFILE_FIELDS = 'id, email, first_name, last_name, rut, phone, role, is_active, doctor_id, created_at, updated_at';

/**
 * Lista usuarios con paginación.
 * Excluye fichas médicas de los datos retornados.
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Registros por página
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function listUsers(page, limit) {
  const { from, to, page: currentPage, limit: currentLimit } = paginate(page, limit);

  // Obtener el total de registros
  const { count, error: countError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw countError;
  }

  // Obtener usuarios paginados (solo campos de perfil, sin fichas médicas)
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(USER_PROFILE_FIELDS)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const pagination = buildPaginationMeta(count, currentPage, currentLimit);

  return { data, pagination };
}

/**
 * Obtiene un usuario por su ID.
 * Retorna datos de perfil (sin fichas médicas).
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} Datos del usuario
 * @throws {NotFoundError} Si el usuario no existe
 */
async function getUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(USER_PROFILE_FIELDS)
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Usuario');
  }

  return data;
}

/**
 * Actualiza los campos de perfil de un usuario.
 * @param {string} userId - UUID del usuario
 * @param {Object} updateData - Campos a actualizar (first_name, last_name, phone, role, etc.)
 * @returns {Promise<Object>} Datos actualizados del usuario
 * @throws {NotFoundError} Si el usuario no existe
 */
async function updateUser(userId, updateData) {
  // Filtrar solo campos permitidos para actualización
  const allowedFields = ['first_name', 'last_name', 'phone', 'role', 'email'];
  const filteredData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  filteredData.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(filteredData)
    .eq('id', userId)
    .select(USER_PROFILE_FIELDS)
    .single();

  if (error || !data) {
    throw new NotFoundError('Usuario');
  }

  return data;
}

/**
 * Deshabilita un usuario estableciendo is_active = false.
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} Datos actualizados del usuario
 * @throws {NotFoundError} Si el usuario no existe
 */
async function disableUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select(USER_PROFILE_FIELDS)
    .single();

  if (error || !data) {
    throw new NotFoundError('Usuario');
  }

  return data;
}

/**
 * Habilita un usuario estableciendo is_active = true.
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} Datos actualizados del usuario
 * @throws {NotFoundError} Si el usuario no existe
 */
async function enableUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select(USER_PROFILE_FIELDS)
    .single();

  if (error || !data) {
    throw new NotFoundError('Usuario');
  }

  return data;
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  disableUser,
  enableUser,
};
