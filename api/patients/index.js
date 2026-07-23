const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const patientService = require('../../lib/services/patientService');
const { createPatientSchema } = require('../../lib/validators/patientSchemas');

/**
 * GET /api/patients - Lista paginada de pacientes del doctor
 * POST /api/patients - Crear un nuevo paciente
 * Requiere rol Doctor.
 *
 * Requerimientos: 16.1, 16.2
 */
async function handler(req, res) {
  switch (req.method) {
    case 'GET': {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await patientService.list(req.user.id, page, limit);
      return success(res, result);
    }

    case 'POST': {
      const patient = await patientService.create(req.user.id, req.body);
      return success(res, patient, 201);
    }

    default:
      return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }
}

/**
 * Handler con validación solo para POST.
 * GET no requiere validación de body.
 */
async function routeHandler(req, res) {
  if (req.method === 'POST') {
    // Aplicar validación solo para POST
    return validate(createPatientSchema)(handler)(req, res);
  }
  return handler(req, res);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor'])(
          routeHandler
        )
      )
    )
  )
);
