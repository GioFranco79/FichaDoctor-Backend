const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const notificationService = require('../../lib/services/notificationService');

/**
 * PATCH /api/notifications/read-all - Marcar todas las notificaciones como leídas
 * Marca todas las notificaciones no leídas del usuario autenticado como leídas.
 * Cualquier usuario autenticado puede marcar todas sus notificaciones.
 *
 * Requerimientos: 15.5
 */
async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const result = await notificationService.markAllAsRead(req.user.id);

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
