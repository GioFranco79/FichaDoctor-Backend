/**
 * GET/POST/DELETE /api/schedule/available-slots
 *
 * Endpoint para gestionar slots disponibles del doctor.
 * - GET: Obtener slots habilitados para un rango de fechas
 * - POST: Habilitar un slot (crear)
 * - DELETE: Deshabilitar un slot (eliminar)
 *
 * Requiere rol Doctor o Secretaria.
 */

const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const { success, error } = require('../../lib/utils/responseHelper');
const supabaseAdmin = require('../../lib/supabaseAdmin');

async function handler(req, res) {
  const doctorId = req.query.doctor_id || req.body?.doctor_id || req.user.id;

  if (req.method === 'GET') {
    // Get all enabled slots for a date range (any authenticated user can read)
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return error(res, 'VALIDATION_ERROR', 'startDate y endDate son requeridos', 400);
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('available_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time');

    if (dbError) {
      return error(res, 'DB_ERROR', 'Error al obtener slots disponibles', 500);
    }

    // Filter out slots that already have a booked appointment (pending or confirmed only)
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date, start_time')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .in('status', ['pendiente', 'confirmada']);

    const bookedSet = new Set(
      (appointments || []).map(a => `${a.appointment_date}|${a.start_time.substring(0, 5)}`)
    );

    const availableSlots = (data || []).filter(slot => {
      const key = `${slot.date}|${slot.start_time.substring(0, 5)}`;
      return !bookedSet.has(key);
    });

    return success(res, availableSlots);
  }

  if (req.method === 'POST') {
    // Enable a slot (only Doctor or Secretaria)
    if (!req.user.role || !['Doctor', 'Secretaria'].includes(req.user.role)) {
      return error(res, 'FORBIDDEN', 'No tiene permisos para habilitar slots', 403);
    }

    const { date, start_time, end_time } = req.body;

    if (!date || !start_time || !end_time) {
      return error(res, 'VALIDATION_ERROR', 'date, start_time y end_time son requeridos', 400);
    }

    const { data, error: dbError } = await supabaseAdmin
      .from('available_slots')
      .upsert({
        doctor_id: doctorId,
        date,
        start_time,
        end_time,
      }, { onConflict: 'doctor_id,date,start_time' })
      .select()
      .single();

    if (dbError) {
      return error(res, 'DB_ERROR', `Error al habilitar slot: ${dbError.message}`, 500);
    }

    return success(res, data, 201);
  }

  if (req.method === 'DELETE') {
    // Disable a slot (only Doctor or Secretaria)
    if (!req.user.role || !['Doctor', 'Secretaria'].includes(req.user.role)) {
      return error(res, 'FORBIDDEN', 'No tiene permisos para deshabilitar slots', 403);
    }

    const { date, start_time } = req.query;

    if (!date || !start_time) {
      return error(res, 'VALIDATION_ERROR', 'date y start_time son requeridos', 400);
    }

    // Decode + to spaces (vercel dev issue)
    const decodedDate = decodeURIComponent((date || '').replace(/\+/g, ' '));
    const decodedStartTime = decodeURIComponent((start_time || '').replace(/\+/g, ' '));

    const { error: dbError } = await supabaseAdmin
      .from('available_slots')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('date', decodedDate)
      .eq('start_time', decodedStartTime);

    if (dbError) {
      return error(res, 'DB_ERROR', `Error al deshabilitar slot: ${dbError.message}`, 500);
    }

    return success(res, { deleted: true });
  }

  return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
