/**
 * GET /api/patients/my-doctors
 *
 * Endpoint para obtener los doctores que han atendido al paciente autenticado.
 * Lista doctores que tienen citas con el paciente (basado en appointments).
 * Requiere rol Paciente.
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

  if (req.user.role !== 'Paciente') {
    return error(res, 'FORBIDDEN', 'Solo pacientes pueden acceder', 403);
  }

  const patientId = req.user.id;

  // Get unique doctor_ids from patient's appointments
  const { data: appointments, error: dbError } = await supabaseAdmin
    .from('appointments')
    .select('doctor_id')
    .eq('patient_id', patientId);

  if (dbError) {
    return error(res, 'DB_ERROR', 'Error al obtener doctores', 500);
  }

  const doctorIds = [...new Set((appointments || []).map(a => a.doctor_id).filter(Boolean))];

  if (doctorIds.length === 0) {
    return success(res, []);
  }

  // Fetch doctor details
  const { data: doctors, error: doctorsError } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, especialidad')
    .in('id', doctorIds)
    .order('last_name');

  if (doctorsError) {
    return error(res, 'DB_ERROR', 'Error al obtener datos de doctores', 500);
  }

  return success(res, doctors || []);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
