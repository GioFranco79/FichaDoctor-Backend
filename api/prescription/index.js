const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const withRole = require('../../lib/middleware/withRole');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const prescriptionService = require('../../lib/services/prescriptionService');
const { createPrescriptionSchema } = require('../../lib/validators/prescriptionSchemas');

/**
 * GET /api/prescription - Lista de recetas del paciente solicitante
 * POST /api/prescription - Crear una nueva receta médica (requiere rol Doctor)
 *
 * GET: Roles permitidos: Doctor, Paciente
 * POST: Roles permitidos: Doctor
 *
 * Requerimientos: 17.1, 17.3
 */
async function handler(req, res) {
  switch (req.method) {
    case 'GET': {
      const prescriptions = await prescriptionService.getByPatient(req.user.id);
      return success(res, prescriptions);
    }

    case 'POST': {
      // Solo Doctor puede crear recetas
      if (req.user.role !== 'Doctor') {
        return error(res, 'FORBIDDEN', 'Solo los doctores pueden crear recetas', 403);
      }

      const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const prescription = await prescriptionService.create(req.user.id, req.body, ipAddress);
      return success(res, prescription, 201);
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
    return validate(createPrescriptionSchema)(handler)(req, res);
  }
  return handler(req, res);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Paciente'])(
          routeHandler
        )
      )
    )
  )
);
