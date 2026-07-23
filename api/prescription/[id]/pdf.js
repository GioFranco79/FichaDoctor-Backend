const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { error } = require('../../../lib/utils/responseHelper');
const prescriptionService = require('../../../lib/services/prescriptionService');

/**
 * GET /api/prescription/:id/pdf - Generar y descargar PDF de una receta
 * Roles permitidos: Doctor, Paciente (ownership verificado en el servicio)
 *
 * Requerimientos: 17.2, 17.4
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de receta requerido', 400);
  }

  const pdfBuffer = await prescriptionService.generatePdf(id, req.user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receta-${id}.pdf"`);
  res.status(200).send(pdfBuffer);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        withRole(['Doctor', 'Paciente'])(
          handler
        )
      )
    )
  )
);
