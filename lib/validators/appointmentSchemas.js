const Joi = require('joi');

/**
 * Schema para crear una cita médica
 * Valida: doctor_id (UUID requerido), appointment_date (fecha ISO YYYY-MM-DD requerida),
 * start_time (formato HH:mm requerido), notes (string opcional)
 *
 * Requerimientos: 10.1
 */
const createAppointmentSchema = Joi.object({
  doctor_id: Joi.string()
    .guid({ version: ['uuidv4'] })
    .required()
    .messages({
      'string.guid': 'doctor_id debe ser un UUID válido',
      'any.required': 'doctor_id es requerido',
    }),
  patient_id: Joi.string()
    .guid({ version: ['uuidv4'] })
    .optional()
    .messages({
      'string.guid': 'patient_id debe ser un UUID válido',
    }),
  appointment_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'appointment_date debe tener formato YYYY-MM-DD',
      'any.required': 'appointment_date es requerido',
    }),
  start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'start_time debe tener formato HH:mm (00:00 - 23:59)',
      'any.required': 'start_time es requerido',
    }),
  notes: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'notes debe ser un texto',
    }),
});

/**
 * Schema para actualizar una cita médica
 * Valida: appointment_date (fecha ISO opcional), start_time (formato HH:mm opcional),
 * notes (string opcional). Al menos un campo es requerido.
 *
 * Requerimientos: 11.1
 */
const updateAppointmentSchema = Joi.object({
  appointment_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'appointment_date debe tener formato YYYY-MM-DD',
    }),
  start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .messages({
      'string.pattern.base': 'start_time debe tener formato HH:mm (00:00 - 23:59)',
    }),
  notes: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'notes debe ser un texto',
    }),
}).min(1).messages({
  'object.min': 'Se requiere al menos un campo para actualizar (appointment_date, start_time o notes)',
});

/**
 * Schema para cambiar el estado de una cita médica
 * Valida: status (requerido, valores válidos: pendiente, confirmada, completada, cancelada)
 *
 * Requerimientos: 12.3
 */
const changeStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pendiente', 'confirmada', 'completada', 'cancelada')
    .required()
    .messages({
      'any.only': 'status debe ser uno de: pendiente, confirmada, completada, cancelada',
      'any.required': 'status es requerido',
    }),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
};
