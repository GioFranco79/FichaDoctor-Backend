const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const messageService = require('../../lib/services/messageService');

/**
 * GET /api/messages/sent - Mensajes enviados paginados
 * Retorna los mensajes enviados por el usuario autenticado.
 * Cualquier usuario autenticado puede consultar sus mensajes enviados.
 *
 * Requerimientos: 14.3
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await messageService.getSent(req.user.id, page, limit);

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
