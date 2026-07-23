/**
 * POST /api/auth/login
 *
 * Endpoint de inicio de sesión.
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → validate → handler
 *
 * Requerimientos: 5.1
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { loginSchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { email, password } = req.body;
  const result = await authService.login(email, password);
  return success(res, result, 200);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      validate(loginSchema)(handler)
    )
  )
);
