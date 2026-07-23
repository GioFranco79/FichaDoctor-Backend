/**
 * GET /api/doctors/my-patients
 *
 * Endpoint para obtener los pacientes del doctor autenticado.
 * Lista pacientes que tienen citas con el doctor (basado en appointments).
 * Requiere rol Doctor.
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

  if (req.user.role !== 'Doctor') {
    return error(res, 'FORBIDDEN', 'Solo doctores pueden acceder', 403);
  }

  const doctorId = req.user.id;

  // Get unique patient_ids from appointments
  const { data: appointments, error: dbError } = await supabaseAdmin
    .from('appointments')
    .select('patient_id')
    .eq('doctor_id', doctorId);

  if (dbError) {
    return error(res, 'DB_ERROR', 'Error al obtener pacientes', 500);
  }

  // Get unique patient IDs
  const patientIds = [...new Set((appointments || []).map(a => a.patient_id).filter(Boolean))];

  if (patientIds.length === 0) {
    return success(res, []);
  }

  // Fetch patient details
  const { data: patients, error: patientsError } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, rut, email')
    .in('id', patientIds)
    .order('last_name');

  if (patientsError) {
    return error(res, 'DB_ERROR', 'Error al obtener datos de pacientes', 500);
  }

  return success(res, patients || []);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
