/**
 * POST /api/auth/register
 *
 * Endpoint de registro de usuarios.
 * Middleware chain: errorHandler → cors → rateLimit[10/min] → validate → handler
 *
 * Requerimientos: 4.1
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withAuthRateLimit } = require('../../lib/middleware/rateLimit');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const authService = require('../../lib/services/authService');
const { registerSchema } = require('../../lib/validators/authSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const result = await authService.register(req.body);
  return success(res, result, 201);
}

module.exports = withErrorHandler(
  withCors(
    withAuthRateLimit(
      validate(registerSchema)(handler)
    )
  )
);
