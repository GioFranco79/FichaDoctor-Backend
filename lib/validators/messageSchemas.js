const Joi = require('joi');

/**
 * Schema para enviar un mensaje interno
 * Valida: recipient_id (UUID requerido), content (string requerido, min 1 carácter, no vacío)
 *
 * Requerimientos: 14.1
 */
const sendMessageSchema = Joi.object({
  recipient_id: Joi.string().uuid().required().messages({
    'string.guid': 'El destinatario_id debe ser un UUID válido',
    'any.required': 'El destinatario_id es obligatorio',
  }),
  content: Joi.string().min(1).trim().required().messages({
    'string.min': 'El contenido del mensaje no puede estar vacío',
    'string.empty': 'El contenido del mensaje no puede estar vacío',
    'any.required': 'El contenido del mensaje es obligatorio',
  }),
});

module.exports = {
  sendMessageSchema,
};
