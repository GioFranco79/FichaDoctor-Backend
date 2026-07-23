/**
 * PUT /api/schedule/:id
 *
 * Endpoint para actualizar configuración de disponibilidad del doctor.
 * Requiere rol Doctor o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → validate → handler
 *
 * Requerimientos: 18.2
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
  if (req.method !== 'PUT') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de configuración requerido', 400);
  }

  const result = await scheduleService.updateConfig(id, req.body, req.user);

  return success(res, result);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Secretaria'])(
          validate(scheduleConfigSchema)(handler)
        )
      )
    )
  )
);
