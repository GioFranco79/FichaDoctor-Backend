/**
 * POST /api/auth/reset-password
 *
 * Endpoint de restablecimiento de contraseña.
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → validate → handler
 *
 * Requerimientos: 7.3
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { resetPasswordSchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  return success(res, result, 200);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      validate(resetPasswordSchema)(handler)
    )
  )
);
