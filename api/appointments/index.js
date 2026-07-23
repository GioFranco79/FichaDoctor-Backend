/**
 * GET /api/appointments - Listar citas con filtros según rol
 * POST /api/appointments - Crear una nueva cita médica
 *
 * Roles permitidos:
 * - GET: Doctor, Paciente, Secretaria
 * - POST: Paciente, Secretaria
 *
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → handler
 *
 * Requerimientos: 10.1, 11.1, 12.1, 12.3
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const appointmentService = require('../../lib/services/appointmentService');
const { createAppointmentSchema } = require('../../lib/validators/appointmentSchemas');

async function handler(req, res) {
  switch (req.method) {
    case 'GET': {
      const result = await appointmentService.list(req.user, req.query);
      return success(res, result);
    }

    case 'POST': {
      // Solo Paciente o Secretaria pueden crear citas
      console.log('[POST /api/appointments] user.role:', req.user.role, 'user.id:', req.user.id);
      if (req.user.role !== 'Paciente' && req.user.role !== 'Secretaria') {
        return error(res, 'FORBIDDEN', `Solo Paciente o Secretaria pueden crear citas (rol actual: ${req.user.role || 'null'})`, 403);
      }

      const appointment = await appointmentService.create(req.user, req.body);
      return success(res, appointment, 201);
    }

    default:
      return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }
}

/**
 * Handler con validación solo para POST.
 * GET no requiere validación de body.
 */
async function routeHandler(req, res) {
  if (req.method === 'POST') {
    return validate(createAppointmentSchema)(handler)(req, res);
  }
  return handler(req, res);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Paciente', 'Secretaria'])(
          routeHandler
        )
      )
    )
  )
);
