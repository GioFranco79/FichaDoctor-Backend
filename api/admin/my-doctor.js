/**
 * GET /api/admin/my-doctor
 *
 * Endpoint para que la secretaria obtenga los datos del doctor al que está asignada.
 * Requiere rol Secretaria.
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const supabaseAdmin = require('../../lib/supabaseAdmin');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  if (req.user.role !== 'Secretaria') {
    return error(res, 'FORBIDDEN', 'Solo secretarias pueden acceder', 403);
  }

  // Get secretary's doctor_id
  const { data: secretary, error: secError } = await supabaseAdmin
    .from('users')
    .select('doctor_id')
    .eq('id', req.user.id)
    .single();

  if (secError || !secretary || !secretary.doctor_id) {
    return error(res, 'NOT_FOUND', 'No tienes un doctor asignado', 404);
  }

  // Get doctor data
  const { data: doctor, error: docError } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, especialidad')
    .eq('id', secretary.doctor_id)
    .single();

  if (docError || !doctor) {
    return error(res, 'NOT_FOUND', 'Doctor no encontrado', 404);
  }

  return success(res, doctor);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
