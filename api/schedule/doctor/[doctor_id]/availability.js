/**
 * GET /api/schedule/doctor/:doctor_id/availability
 *
 * Endpoint para consultar la disponibilidad de un doctor.
 * Requiere autenticación pero cualquier rol autenticado puede acceder.
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → validate(query) → handler
 *
 * Requerimientos: 18.4
 */

const { withErrorHandler } = require('../../../../lib/middleware/errorHandler');
const { withCors } = require('../../../../lib/middleware/cors');
const { withRateLimit } = require('../../../../lib/middleware/rateLimit');
const withAuth = require('../../../../lib/middleware/withAuth');
const validate = require('../../../../lib/middleware/validate');
const { success, error } = require('../../../../lib/utils/responseHelper');
const scheduleService = require('../../../../lib/services/scheduleService');
const { availabilityQuerySchema } = require('../../../../lib/validators/scheduleSchemas');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { doctor_id } = req.query;

  if (!doctor_id) {
    return error(res, 'VALIDATION_ERROR', 'doctor_id es requerido', 400);
  }

  const { startDate, endDate } = req.query;
  const result = await scheduleService.getAvailability(doctor_id, startDate, endDate);

  return success(res, result);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        validate(availabilityQuerySchema, 'query')(handler)
      )
    )
  )
);
