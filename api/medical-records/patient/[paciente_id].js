const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const medicalRecordService = require('../../../lib/services/medicalRecordService');

/**
 * GET /api/medical-records/patient/:paciente_id - Obtener historial médico de un paciente
 * Requiere rol Doctor con relación de atención.
 *
 * Requerimientos: 13.3
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { paciente_id } = req.query;

  if (!paciente_id) {
    return error(res, 'VALIDATION_ERROR', 'ID de paciente requerido', 400);
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  const records = await medicalRecordService.getByPatient(paciente_id, req.user.id, ipAddress);
  return success(res, records);
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
