/**
 * POST /api/auth/register-secretary
 *
 * Endpoint de registro de secretaria (requiere rol Doctor).
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → withAuth → withRole(['Doctor']) → validate → handler
 *
 * Requerimientos: 19.1
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { registerSecretarySchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const result = await authService.registerSecretary(req.user.id, req.body);
  return success(res, result, 201);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      withAuth(
        withRole(['Doctor'])(
          validate(registerSecretarySchema)(handler)
        )
      )
    )
  )
);
