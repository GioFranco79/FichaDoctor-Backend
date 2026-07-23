/**
 * GET /api/appointments/:id - Obtener una cita específica con datos del paciente
 * PUT /api/appointments/:id - Modificar una cita médica existente
 *
 * Requiere rol Doctor, Paciente o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → handler
 *
 * Requerimientos: 11.1, 11.2
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const appointmentService = require('../../lib/services/appointmentService');
const supabaseAdmin = require('../../lib/supabaseAdmin');
const { updateAppointmentSchema } = require('../../lib/validators/appointmentSchemas');

async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de cita requerido', 400);
  }

  if (req.method === 'GET') {
    const { data, error: dbError } = await supabaseAdmin
      .from('appointments')
      .select('*, patient:patient_id(id, first_name, last_name, email, rut, phone, direccion, comuna, region)')
      .eq('id', id)
      .single();

    if (dbError || !data) {
      return error(res, 'NOT_FOUND', 'Cita no encontrada', 404);
    }

    return success(res, data);
  }

  if (req.method === 'PUT') {
    const result = await appointmentService.update(id, req.user, req.body);
    return success(res, result);
  }

  return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
}

async function routeHandler(req, res) {
  if (req.method === 'PUT') {
    return validate(updateAppointmentSchema)(handler)(req, res);
  }
  return handler(req, res);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Paciente', 'Secretaria'])(routeHandler)
      )
    )
  )
);
