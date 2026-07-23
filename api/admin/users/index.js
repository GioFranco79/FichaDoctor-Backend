const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const adminService = require('../../../lib/services/adminService');

/**
 * GET /api/admin/users
 * Lista paginada de todos los usuarios (solo Admin).
 * Query params: page (default 1), limit (default 20)
 *
 * Requerimiento: 9.1
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await adminService.listUsers(page, limit);

  return success(res, result);
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
