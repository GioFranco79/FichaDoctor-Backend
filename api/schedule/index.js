/**
 * POST /api/schedule
 *
 * Endpoint para crear configuración de disponibilidad del doctor.
 * Requiere rol Doctor o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → validate → handler
 *
 * Requerimientos: 18.1, 18.5
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const scheduleService = require('../../lib/services/scheduleService');
const { scheduleConfigSchema } = require('../../lib/validators/scheduleSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const doctorId = req.body.doctor_id || req.user.id;
  console.log('[POST /api/schedule] SUCCESS - doctorId:', doctorId, 'user.id:', req.user.id, 'user.role:', req.user.role);
  
  const result = await scheduleService.createConfig(doctorId, req.body, req.user);

  return success(res, result, 201);
}

// Wrapper to log validation/role errors
function logWrapper(handler) {
  return async (req, res) => {
    console.log('[POST /api/schedule] Request received - method:', req.method, 'body:', JSON.stringify(req.body), 'user:', req.user?.id, req.user?.role);
    return handler(req, res);
  };
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        logWrapper(
          withRole(['Doctor', 'Secretaria'])(
            validate(scheduleConfigSchema)(handler)
          )
        )
      )
    )
  )
);
