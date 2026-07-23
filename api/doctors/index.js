/**
 * GET /api/doctors
 *
 * Endpoint público (autenticado) para listar doctores con filtros opcionales.
 * Query params:
 *   - search (string): Búsqueda por nombre o apellido
 *   - specialty (string): Filtrar por especialidad
 *   - region (string): Filtrar por región
 *   - comuna (string): Filtrar por comuna
 *
 * Middleware chain: errorHandler → cors → rateLimit → withAuth → handler
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

  const { search: rawSearch, specialty: rawSpecialty, region: rawRegion, comuna: rawComuna } = req.query;

  // Decode URI components (vercel dev may pass + instead of spaces)
  const search = rawSearch ? decodeURIComponent(rawSearch.replace(/\+/g, ' ')) : undefined;
  const specialty = rawSpecialty ? decodeURIComponent(rawSpecialty.replace(/\+/g, ' ')) : undefined;
  const region = rawRegion ? decodeURIComponent(rawRegion.replace(/\+/g, ' ')) : undefined;
  const comuna = rawComuna ? decodeURIComponent(rawComuna.replace(/\+/g, ' ')) : undefined;

  try {
    let query = supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, especialidad, region, comuna')
      .eq('role', 'Doctor')
      .eq('is_active', true);

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    if (specialty) {
      query = query.eq('especialidad', specialty);
    }

    if (region) {
      query = query.eq('region', region);
    }

    if (comuna) {
      query = query.eq('comuna', comuna);
    }

    // Order by last_name
    query = query.order('last_name', { ascending: true });

    const { data, error: dbError } = await query;

    console.log('[/api/doctors] Query params:', { search, specialty, region, comuna });
    console.log('[/api/doctors] DB result:', data?.length, 'records, error:', dbError);

    if (dbError) {
      console.error('[/api/doctors] DB Error:', dbError);
      return error(res, 'DB_ERROR', `Error al buscar doctores: ${dbError.message}`, 500);
    }

    // Map especialidad to specialty for frontend compatibility
    const doctors = (data || []).map(d => ({
      id: d.id,
      email: d.email,
      first_name: d.first_name,
      last_name: d.last_name,
      specialty: d.especialidad,
      region: d.region,
      comuna: d.comuna,
    }));

    return success(res, doctors);
  } catch (err) {
    console.error('[/api/doctors] Exception:', err);
    return error(res, 'INTERNAL_ERROR', `Error interno: ${err.message}`, 500);
  }
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
