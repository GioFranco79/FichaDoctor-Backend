const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const supabaseAdmin = require('../../../lib/supabaseAdmin');
const { logClinicalAccess } = require('../../../lib/services/auditService');

/**
 * DELETE /api/patients/me/clinical-data
 * Elimina los datos clínicos del paciente solicitante.
 * Conforme al derecho de cancelación de la Ley 19.628 sobre Protección de la Vida Privada.
 * Elimina: fichas médicas (medical_records) y recetas (prescriptions) del paciente.
 * Requiere rol Paciente.
 *
 * Requerimiento: 20.5
 */
async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const patientId = req.user.id;

  // Eliminar fichas médicas del paciente
  const { error: medicalError } = await supabaseAdmin
    .from('medical_records')
    .delete()
    .eq('patient_id', patientId);

  if (medicalError) {
    throw medicalError;
  }

  // Eliminar recetas del paciente
  const { error: prescriptionError } = await supabaseAdmin
    .from('prescriptions')
    .delete()
    .eq('patient_id', patientId);

  if (prescriptionError) {
    throw prescriptionError;
  }

  // Registrar en audit_log la eliminación de datos clínicos
  const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  await logClinicalAccess(patientId, 'DELETE', 'clinical_data', null, ipAddress);

  return success(res, { message: 'Datos clínicos eliminados exitosamente' });
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Paciente'])(
          handler
        )
      )
    )
  )
);
