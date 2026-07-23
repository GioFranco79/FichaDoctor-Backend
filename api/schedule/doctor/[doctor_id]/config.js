/**
 * GET /api/schedule/doctor/:doctor_id/config
 *
 * Endpoint para obtener la configuración de agenda de un doctor.
 * Requiere autenticación.
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → handler
 */

const { withErrorHandler } = require('../../../../lib/middleware/errorHandler');
const { withCors } = require('../../../../lib/middleware/cors');
const { withRateLimit } = require('../../../../lib/middleware/rateLimit');
const withAuth = require('../../../../lib/middleware/withAuth');
const { success, error } = require('../../../../lib/utils/responseHelper');
const supabaseAdmin = require('../../../../lib/supabaseAdmin');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { doctor_id } = req.query;

  if (!doctor_id) {
    return error(res, 'VALIDATION_ERROR', 'doctor_id es requerido', 400);
  }

  const { data, error: dbError } = await supabaseAdmin
    .from('schedule_config')
    .select('*')
    .eq('doctor_id', doctor_id)
    .single();

  if (dbError || !data) {
    return error(res, 'NOT_FOUND', 'Configuración de agenda no encontrada', 404);
  }

  return success(res, data);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
