const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const patientService = require('../../lib/services/patientService');
const { updatePatientSchema } = require('../../lib/validators/patientSchemas');

/**
 * GET /api/patients/:id - Obtener perfil completo de un paciente
 * PUT /api/patients/:id - Actualizar datos del paciente
 * Requiere rol Doctor con relación de atención.
 *
 * Requerimientos: 16.3, 16.4
 */
async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de paciente requerido', 400);
  }

  switch (req.method) {
    case 'GET': {
      const patient = await patientService.getById(id, req.user.id);
      return success(res, patient);
    }

    case 'PUT': {
      const updatedPatient = await patientService.update(id, req.user.id, req.body);
      return success(res, updatedPatient);
    }

    default:
      return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }
}

/**
 * Handler con validación solo para PUT.
 * GET no requiere validación de body.
 */
async function routeHandler(req, res) {
  if (req.method === 'PUT') {
    return validate(updatePatientSchema)(handler)(req, res);
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
