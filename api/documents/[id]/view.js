/**
 * GET /api/documents/:id/view
 *
 * Obtiene una URL firmada para visualizar un documento PDF.
 * Solo el doctor que emitió el documento puede acceder.
 * Requiere rol Doctor.
 */

const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const { success, error } = require('../../../lib/utils/responseHelper');
const supabaseAdmin = require('../../../lib/supabaseAdmin');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  if (req.user.role !== 'Doctor') {
    return error(res, 'FORBIDDEN', 'Solo doctores pueden ver documentos', 403);
  }

  const { id } = req.query;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de documento requerido', 400);
  }

  // Fetch document record
  const { data: document, error: dbError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('doctor_id', req.user.id)
    .single();

  if (dbError || !document) {
    return error(res, 'NOT_FOUND', 'Documento no encontrado', 404);
  }

  // Generate signed URL
  const { data: signedUrl, error: storageError } = await supabaseAdmin.storage
    .from('medical-documents')
    .createSignedUrl(document.file_path, 3600);

  if (storageError || !signedUrl) {
    return error(res, 'STORAGE_ERROR', 'Error al obtener URL del documento', 500);
  }

  return success(res, { url: signedUrl.signedUrl });
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(handler)
    )
  )
);
