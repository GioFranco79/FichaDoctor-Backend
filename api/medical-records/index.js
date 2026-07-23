const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const { success, error } = require('../../lib/utils/responseHelper');
const medicalRecordService = require('../../lib/services/medicalRecordService');

/**
 * GET /api/medical-records - Obtener fichas médicas propias del paciente
 * Requiere rol Paciente.
 *
 * Requerimientos: 13.4
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  const records = await medicalRecordService.getOwn(req.user.id, ipAddress);
  return success(res, records);
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
