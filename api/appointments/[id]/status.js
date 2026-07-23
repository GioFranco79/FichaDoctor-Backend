/**
 * PATCH /api/appointments/:id/status
 *
 * Endpoint para cambiar el estado de una cita médica.
 * Requiere rol Doctor.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → validate → handler
 *
 * Requerimientos: 12.3
 */

const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const validate = require('../../../lib/middleware/validate');
const { success, error } = require('../../../lib/utils/responseHelper');
const appointmentService = require('../../../lib/services/appointmentService');
const { changeStatusSchema } = require('../../../lib/validators/appointmentSchemas');

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de cita requerido', 400);
  }

  const result = await appointmentService.changeStatus(id, req.user, req.body.status);

  return success(res, result);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor'])(
          validate(changeStatusSchema)(handler)
        )
      )
    )
  )
);
