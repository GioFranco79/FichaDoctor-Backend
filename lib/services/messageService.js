const supabaseAdmin = require('../supabaseAdmin');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, AuthorizationError } = require('../errors');

/**
 * Campos a seleccionar al consultar mensajes.
 */
const MESSAGE_FIELDS = 'id, sender_id, recipient_id, content, is_read, created_at';

/**
 * Envía un mensaje de un usuario a otro.
 * @param {string} senderId - UUID del emisor
 * @param {string} recipientId - UUID del destinatario
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} Mensaje creado
 */
async function send(senderId, recipientId, content) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      is_read: false
    })
    .select(MESSAGE_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Obtiene la bandeja de entrada de un usuario (mensajes recibidos) con paginación.
 * @param {string} userId - UUID del usuario destinatario
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Registros por página
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function getInbox(userId, page, limit) {
  const { from, to, page: currentPage, limit: currentLimit } = paginate(page, limit);

  // Obtener el total de mensajes recibidos
  const { count, error: countError } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId);

  if (countError) {
    throw countError;
  }

  // Obtener mensajes paginados ordenados por fecha descendente
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_FIELDS)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const pagination = buildPaginationMeta(count, currentPage, currentLimit);

  return { data, pagination };
}

/**
 * Obtiene los mensajes enviados por un usuario con paginación.
 * @param {string} userId - UUID del usuario emisor
 * @param {number} [page=1] - Número de página
 * @param {number} [limit=20] - Registros por página
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function getSent(userId, page, limit) {
  const { from, to, page: currentPage, limit: currentLimit } = paginate(page, limit);

  // Obtener el total de mensajes enviados
  const { count, error: countError } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', userId);

  if (countError) {
    throw countError;
  }

  // Obtener mensajes paginados ordenados por fecha descendente
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_FIELDS)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const pagination = buildPaginationMeta(count, currentPage, currentLimit);

  return { data, pagination };
}

/**
 * Marca un mensaje como leído. Verifica que el usuario sea el destinatario.
 * @param {string} messageId - UUID del mensaje
 * @param {string} userId - UUID del usuario que solicita marcar como leído
 * @returns {Promise<Object>} Mensaje actualizado
 * @throws {NotFoundError} Si el mensaje no existe
 * @throws {AuthorizationError} Si el usuario no es el destinatario
 */
async function markAsRead(messageId, userId) {
  // Primero obtener el mensaje para verificar el destinatario
  const { data: message, error: fetchError } = await supabaseAdmin
    .from('messages')
    .select(MESSAGE_FIELDS)
    .eq('id', messageId)
    .single();

  if (fetchError || !message) {
    throw new NotFoundError('Mensaje');
  }

  // Verificar que el usuario es el destinatario
  if (message.recipient_id !== userId) {
    throw new AuthorizationError('Solo el destinatario puede marcar el mensaje como leído');
  }

  // Actualizar is_read a true
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId)
    .select(MESSAGE_FIELDS)
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated;
}

module.exports = {
  send,
  getInbox,
  getSent,
  markAsRead,
};
