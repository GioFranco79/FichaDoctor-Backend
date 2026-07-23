const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const { success, error } = require('../../../lib/utils/responseHelper');
const messageService = require('../../../lib/services/messageService');

/**
 * PATCH /api/messages/:id/read - Marcar mensaje como leído
 * Verifica que el usuario autenticado sea el destinatario del mensaje.
 * Cualquier usuario autenticado puede marcar como leído sus mensajes recibidos.
 *
 * Requerimientos: 14.4
 */
async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de mensaje requerido', 400);
  }

  const message = await messageService.markAsRead(id, req.user.id);

  return success(res, message);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        handler
      )
    )
  )
);
