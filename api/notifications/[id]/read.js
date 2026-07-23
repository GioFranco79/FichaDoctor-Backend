const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const { success, error } = require('../../../lib/utils/responseHelper');
const notificationService = require('../../../lib/services/notificationService');

/**
 * PATCH /api/notifications/:id/read - Marcar notificación como leída
 * Verifica que el usuario autenticado sea el dueño de la notificación.
 * Cualquier usuario autenticado puede marcar como leída su notificación.
 *
 * Requerimientos: 15.4
 */
async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de notificación requerido', 400);
  }

  const notification = await notificationService.markAsRead(id, req.user.id);

  return success(res, notification);
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
