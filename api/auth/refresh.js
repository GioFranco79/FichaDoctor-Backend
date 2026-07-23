/**
 * POST /api/auth/refresh
 *
 * Endpoint de renovación de tokens.
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → validate → handler
 *
 * Requerimientos: 6.1
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { refreshSchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { refresh_token } = req.body;
  const result = await authService.refreshToken(refresh_token);
  return success(res, result, 200);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      validate(refreshSchema)(handler)
    )
  )
);
