const { withErrorHandler } = require('../../../lib/middleware/errorHandler');
const { withCors } = require('../../../lib/middleware/cors');
const { withRateLimit } = require('../../../lib/middleware/rateLimit');
const withAuth = require('../../../lib/middleware/withAuth');
const withRole = require('../../../lib/middleware/withRole');
const { success, error } = require('../../../lib/utils/responseHelper');
const { NotFoundError, AuthorizationError } = require('../../../lib/errors');
const supabaseAdmin = require('../../../lib/supabaseAdmin');

/**
 * DELETE /api/admin/secretaries/:id
 * Desvincula y deshabilita la cuenta de la secretaria especificada.
 * Solo el doctor al que está vinculada puede desvincularla.
 * Requiere rol Doctor.
 *
 * Requerimiento: 19.4
 */
async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const { id } = req.query;
  const doctorId = req.user.id;

  if (!id) {
    return error(res, 'VALIDATION_ERROR', 'ID de secretaria requerido', 400);
  }

  // Verificar que la secretaria existe y pertenece a este doctor
  const { data: secretary, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, doctor_id, role')
    .eq('id', id)
    .single();

  if (fetchError || !secretary) {
    throw new NotFoundError('Secretaria');
  }

  if (secretary.role !== 'Secretaria') {
    throw new NotFoundError('Secretaria');
  }

  if (secretary.doctor_id !== doctorId) {
    throw new AuthorizationError('No tiene permisos para desvincular esta secretaria');
  }

  // Deshabilitar y desvincular la secretaria
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      is_active: false,
      doctor_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, email, first_name, last_name, rut, phone, role, is_active, created_at, updated_at')
    .single();

  if (updateError) {
    throw updateError;
  }

  return success(res, updated);
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
