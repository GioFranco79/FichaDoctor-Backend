/**
 * POST /api/schedule/day-off
 *
 * Endpoint para registrar un día libre del doctor.
 * Requiere rol Doctor o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → validate → handler
 *
 * Requerimientos: 18.3
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const scheduleService = require('../../lib/services/scheduleService');
const { dayOffSchema } = require('../../lib/validators/scheduleSchemas');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const doctorId = req.body.doctor_id || req.user.id;
  const result = await scheduleService.addDayOff(doctorId, req.body.date, req.body.reason, req.user);

  return success(res, result, 201);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Secretaria'])(
          validate(dayOffSchema)(handler)
        )
      )
    )
  )
);
