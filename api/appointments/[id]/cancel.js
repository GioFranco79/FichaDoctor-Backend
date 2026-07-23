/**
 * PATCH /api/appointments/:id/cancel
 *
 * Endpoint para cancelar una cita médica existente.
 * Requiere rol Doctor, Paciente o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → handler
 *
 * Requerimientos: 11.2
 */

const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const appointmentService = require('../../../lib/services/appointmentService');

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de cita requerido', 400);
  }

  const result = await appointmentService.cancel(id, req.user);

  return success(res, result);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Paciente', 'Secretaria'])(
          handler
        )
      )
    )
  )
);
