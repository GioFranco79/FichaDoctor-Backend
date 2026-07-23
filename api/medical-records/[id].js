const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const medicalRecordService = require('../../lib/services/medicalRecordService');
const { updateMedicalRecordSchema } = require('../../lib/validators/medicalRecordSchemas');

/**
 * PUT /api/medical-records/:id - Actualizar una ficha médica existente
 * Requiere rol Doctor y ser el autor del registro.
 *
 * Requerimientos: 13.2
 */
async function handler(req, res) {
  if (req.method !== 'PUT') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de registro médico requerido', 400);
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  const record = await medicalRecordService.update(id, req.user.id, req.body, ipAddress);
  return success(res, record);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor'])(
          validate(updateMedicalRecordSchema)(handler)
        )
      )
    )
  )
);
