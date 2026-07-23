const { withErrorHandler } = require('../../lib/middleware/errorHandler');
const { withCors } = require('../../lib/middleware/cors');
const { withRateLimit } = require('../../lib/middleware/rateLimit');
const withAuth = require('../../lib/middleware/withAuth');
const validate = require('../../lib/middleware/validate');
const { success, error } = require('../../lib/utils/responseHelper');
const messageService = require('../../lib/services/messageService');
const { sendMessageSchema } = require('../../lib/validators/messageSchemas');

/**
 * POST /api/messages - Enviar un mensaje interno
 * Cualquier usuario autenticado puede enviar mensajes.
 *
 * Requerimientos: 14.1
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Método no permitido', 405);
  }

  const message = await messageService.send(
    req.user.id,
    req.body.recipient_id,
    req.body.content
  );

  return success(res, message, 201);
}

module.exports = withErrorHandler(
  withCors(
    withRateLimit(
      withAuth(
        validate(sendMessageSchema)(handler)
      )
    )
  )
);
