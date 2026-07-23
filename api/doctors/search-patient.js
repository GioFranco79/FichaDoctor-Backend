/**
 * GET /api/doctors/search-patient?rut=XX.XXX.XXX-X
 *
 * Busca un paciente por RUT. Accesible por Doctor o Secretaria.
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

  if (!req.user.role || !['Doctor', 'Secretaria'].includes(req.user.role)) {
    return error(res, 'FORBIDDEN', 'No tiene permisos', 403);
  }

  const rawRut = req.query.rut;
  if (!rawRut) {
    return error(res, 'VALIDATION_ERROR', 'RUT es requerido', 400);
  }

  // Decode + to spaces (vercel dev issue)
  const rut = decodeURIComponent(rawRut.replace(/\+/g, ' '));

  const { data, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, rut, email')
    .eq('role', 'Paciente')
    .eq('rut', rut)
    .limit(1);

  if (dbError) {
    return error(res, 'DB_ERROR', 'Error al buscar paciente', 500);
  }

  return success(res, data || []);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
