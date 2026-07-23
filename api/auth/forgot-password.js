/**
 * POST /api/auth/forgot-password
 *
 * Endpoint de solicitud de recuperación de contraseña.
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → validate → handler
 *
 * Requerimientos: 7.1
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { forgotPasswordSchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  return success(res, result, 200);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      validate(forgotPasswordSchema)(handler)
    )
  )
);
