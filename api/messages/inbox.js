const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const messageService = require('../../lib/services/messageService');

/**
 * GET /api/messages/inbox - Bandeja de entrada paginada
 * Retorna los mensajes recibidos por el usuario autenticado.
 * Cualquier usuario autenticado puede consultar su bandeja.
 *
 * Requerimientos: 14.2
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await messageService.getInbox(req.user.id, page, limit);

  return success(res, result);
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
