/**
 * GET /api/documents
 *
 * Lista documentos emitidos por el doctor para un paciente.
 * Query params:
 *   - patient_id (UUID, requerido): ID del paciente
 *
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
    return error(res, 'FORBIDDEN', 'Solo doctores pueden ver documentos', 403);
  }

  const { patient_id, appointment_id } = req.query;

  if (!patient_id) {
    return error(res, 'VALIDATION_ERROR', 'patient_id es requerido', 400);
  }

  let query = supabaseAdmin
    .from('documents')
    .select('*')
    .eq('doctor_id', req.user.id)
    .eq('patient_id', patient_id)
    .order('created_at', { ascending: false });

  if (appointment_id) {
    query = query.eq('appointment_id', appointment_id);
  }

  const { data: documents, error: dbError } = await query;

  if (dbError) {
    return error(res, 'DB_ERROR', 'Error al obtener documentos', 500);
  }

  return success(res, documents || []);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
