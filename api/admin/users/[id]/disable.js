const { withErrorHandler } = require('../../../../lib/middleware/errorHandler');
const { withCors } = require('../../../../lib/middleware/cors');
const { withRateLimit } = require('../../../../lib/middleware/rateLimit');
const withAuth = require('../../../../lib/middleware/withAuth');
const withRole = require('../../../../lib/middleware/withRole');
const { success, error } = require('../../../../lib/utils/responseHelper');
const adminService = require('../../../../lib/services/adminService');

/**
 * PATCH /api/admin/users/:id/disable
 * Deshabilita un usuario, impidiendo futuros inicios de sesión.
 * Requiere rol Admin.
 *
 * Requerimiento: 9.4
 */
async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de usuario requerido', 400);
  }

  const user = await adminService.disableUser(id);

  return success(res, user);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Admin'])(
          handler
        )
      )
    )
  )
);
