/**
 * GET /api/schedule/weekly-view
 *
 * Endpoint para obtener la vista semanal de la agenda del doctor.
 * Retorna una grilla con el estado de cada celda:
 *   - "verde": Slot disponible para agendar citas
 *   - "rojo": Slot con cita agendada por un paciente
 *   - "gris": Slot no disponible (día libre, fuera de horario laboral)
 *
 * Query params:
 *   - startDate (YYYY-MM-DD): Fecha de inicio de la semana
 *   - doctor_id (UUID, opcional): ID del doctor (para secretarias)
 *
 * Requiere rol Doctor o Secretaria.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → withRole → handler
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const { success, error } = require('../../lib/utils/responseHelper');
const scheduleService = require('../../lib/services/scheduleService');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { startDate, doctor_id } = req.query;

  if (!startDate) {
    return error(res, 'VALIDATION_ERROR', 'startDate es requerido (formato YYYY-MM-DD)', 400);
  }

  // Validar formato de fecha
  const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(startDate)) {
    return error(res, 'VALIDATION_ERROR', 'startDate debe tener formato YYYY-MM-DD', 400);
  }

  // Determinar el doctor_id: si es Doctor usa su propio ID, si es Secretaria puede especificarlo
  const doctorId = doctor_id || req.user.id;

  const result = await scheduleService.getWeeklyView(doctorId, startDate, req.user);

  return success(res, result);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Secretaria'])(handler)
      )
    )
  )
);
