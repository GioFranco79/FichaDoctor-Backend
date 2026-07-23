const supabaseAdmin = require('../supabaseAdmin');
const { NotFoundError, AuthorizationError } = require('../errors');
const { paginate, buildPaginationMeta } = require('../utils/pagination');

/**
 * Campos a seleccionar al consultar notificaciones.
 */
const NOTIFICATION_FIELDS = 'id, user_id, type, title, message, metadata, is_read, created_at';

/**
 * Crea una nueva notificación para un usuario.
 * @param {string} userId - UUID del destinatario
 * @param {string} type - Tipo de notificación (appointment_created, appointment_cancelled, message_received, etc.)
 * @param {string} title - Título de la notificación
 * @param {string} message - Mensaje descriptivo
 * @param {Object} [metadata=null] - Datos adicionales en formato JSONB
 * @returns {Promise<Object>} Notificación creada
 *
 * Validates: Requirements 15.1, 15.2
 */
async function create(userId, type, title, message, metadata = null) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      is_read: false
    })
    .select(NOTIFICATION_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Obtiene las notificaciones de un usuario ordenadas por fecha descendente con paginación.
 * @param {string} userId - UUID del usuario
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Registros por página
 * @returns {Promise<{ data: Array, pagination: Object }>}
 *
 * Validates: Requirements 15.3
 */
async function getByUser(userId, page, limit) {
  const { from, to, page: currentPage, limit: currentLimit } = paginate(page, limit);

  // Obtener el total de notificaciones del usuario
  const { count, error: countError } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    throw countError;
  }

  // Obtener notificaciones paginadas ordenadas por fecha descendente
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select(NOTIFICATION_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const pagination = buildPaginationMeta(count, currentPage, currentLimit);

  return { data, pagination };
}

/**
 * Marca una notificación como leída. Verifica que el usuario sea el dueño.
 * @param {string} notificationId - UUID de la notificación
 * @param {string} userId - UUID del usuario que solicita marcar como leída
 * @returns {Promise<Object>} Notificación actualizada
 * @throws {NotFoundError} Si la notificación no existe
 * @throws {AuthorizationError} Si el usuario no es el dueño de la notificación
 *
 * Validates: Requirements 15.4
 */
async function markAsRead(notificationId, userId) {
  // Obtener la notificación para verificar ownership
  const { data: notification, error: fetchError } = await supabaseAdmin
    .from('notifications')
    .select(NOTIFICATION_FIELDS)
    .eq('id', notificationId)
    .single();

  if (fetchError || !notification) {
    throw new NotFoundError('Notificación');
  }

  // Verificar que el usuario es el dueño de la notificación
  if (notification.user_id !== userId) {
    throw new AuthorizationError('No autorizado para modificar esta notificación');
  }

  // Actualizar is_read a true
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select(NOTIFICATION_FIELDS)
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated;
}

/**
 * Marca todas las notificaciones no leídas de un usuario como leídas.
 * @param {string} userId - UUID del usuario
 * @returns {Promise<{ updated: number }>} Cantidad de notificaciones actualizadas
 *
 * Validates: Requirements 15.5
 */
async function markAllAsRead(userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select(NOTIFICATION_FIELDS);

  if (error) {
    throw error;
  }

  return { updated: (data || []).length };
}

/**
 * Crea notificaciones automáticas al crear una cita.
 * Notifica tanto al doctor como al paciente sobre la nueva cita.
 * @param {Object} appointment - Datos de la cita creada
 * @param {string} appointment.doctor_id - UUID del doctor
 * @param {string} appointment.patient_id - UUID del paciente
 * @param {string} appointment.appointment_date - Fecha de la cita
 * @param {string} appointment.start_time - Hora de inicio
 * @param {string} appointment.id - ID de la cita
 *
 * Validates: Requirements 15.1
 */
async function notifyAppointmentCreated(appointment) {
  const metadata = {
    appointment_id: appointment.id,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time
  };

  // Notificar al doctor
  await create(
    appointment.doctor_id,
    'appointment_created',
    'Nueva cita agendada',
    `Se ha agendado una nueva cita para el ${appointment.appointment_date} a las ${appointment.start_time}.`,
    metadata
  );

  // Notificar al paciente
  await create(
    appointment.patient_id,
    'appointment_created',
    'Cita agendada exitosamente',
    `Tu cita ha sido agendada para el ${appointment.appointment_date} a las ${appointment.start_time}.`,
    metadata
  );
}

/**
 * Crea notificaciones automáticas al cancelar una cita.
 * Notifica a las partes afectadas (doctor y paciente) sobre la cancelación.
 * @param {Object} appointment - Datos de la cita cancelada
 * @param {string} appointment.doctor_id - UUID del doctor
 * @param {string} appointment.patient_id - UUID del paciente
 * @param {string} appointment.appointment_date - Fecha de la cita
 * @param {string} appointment.start_time - Hora de inicio
 * @param {string} appointment.id - ID de la cita
 *
 * Validates: Requirements 15.2
 */
async function notifyAppointmentCancelled(appointment) {
  const metadata = {
    appointment_id: appointment.id,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time
  };

  // Notificar al doctor
  await create(
    appointment.doctor_id,
    'appointment_cancelled',
    'Cita cancelada',
    `La cita del ${appointment.appointment_date} a las ${appointment.start_time} ha sido cancelada.`,
    metadata
  );

  // Notificar al paciente
  await create(
    appointment.patient_id,
    'appointment_cancelled',
    'Cita cancelada',
    `Tu cita del ${appointment.appointment_date} a las ${appointment.start_time} ha sido cancelada.`,
    metadata
  );
}

module.exports = {
  create,
  getByUser,
  markAsRead,
  markAllAsRead,
  notifyAppointmentCreated,
  notifyAppointmentCancelled,
};
