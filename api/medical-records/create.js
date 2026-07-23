const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const medicalRecordService = require('../../lib/services/medicalRecordService');
const { createMedicalRecordSchema } = require('../../lib/validators/medicalRecordSchemas');

/**
 * POST /api/medical-records/create - Crear una nueva ficha médica
 * Requiere rol Doctor.
 *
 * Requerimientos: 13.1
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  const record = await medicalRecordService.create(req.user.id, req.body, ipAddress);
  return success(res, record, 201);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor'])(
          validate(createMedicalRecordSchema)(handler)
        )
      )
    )
  )
);
