const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const adminService = require('../../../lib/services/adminService');

/**
 * GET /api/admin/users/:id - Obtener un usuario específico
 * PUT /api/admin/users/:id - Actualizar un usuario específico
 * Requiere rol Admin.
 *
 * Requerimientos: 9.2, 9.3
 */
async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de usuario requerido', 400);
  }

  switch (req.method) {
    case 'GET': {
      const user = await adminService.getUser(id);
      return success(res, user);
    }

    case 'PUT': {
      const updatedUser = await adminService.updateUser(id, req.body);
      return success(res, updatedUser);
    }

    default:
      return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }
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
