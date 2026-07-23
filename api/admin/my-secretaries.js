const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const { success, error } = require('../../lib/utils/responseHelper');
const supabaseAdmin = require('../../lib/supabaseAdmin');

/**
 * GET /api/admin/my-secretaries
 * Retorna la lista de secretarias vinculadas al doctor solicitante.
 * Requiere rol Doctor.
 *
 * Requerimiento: 19.3
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const doctorId = req.user.id;

  const { data, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, rut, phone, role, is_active, created_at, updated_at')
    .eq('doctor_id', doctorId)
    .eq('role', 'Secretaria');

  if (dbError) {
    throw dbError;
  }

  return success(res, data || []);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor'])(
          handler
        )
      )
    )
  )
);
