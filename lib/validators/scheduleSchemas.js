const Joi = require('joi');

/**
 * Regex para formato de hora HH:mm (00:00 - 23:59)
 */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Regex para formato de fecha ISO YYYY-MM-DD
 */
const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Schema para crear o actualizar configuración de agenda del doctor.
 * Valida: workDays (array de enteros 0-6), startTime (HH:mm), endTime (HH:mm),
 * slotDuration (exclusivamente 15, 20 o 30 minutos).
 * doctor_id es opcional — si no se envía, se usa el ID del usuario autenticado.
 *
 * Validates: Requirements 18.1, 18.5
 */
const scheduleConfigSchema = Joi.object({
  doctor_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'doctor_id debe ser un UUID válido',
    }),
  workDays: Joi.array()
    .items(Joi.number().integer().min(0).max(6))
    .min(1)
    .required()
    .messages({
      'array.base': 'workDays debe ser un array de días de la semana',
      'array.min': 'workDays debe contener al menos un día',
      'any.required': 'workDays es requerido',
      'number.min': 'Cada día debe estar entre 0 (Domingo) y 6 (Sábado)',
      'number.max': 'Cada día debe estar entre 0 (Domingo) y 6 (Sábado)',
    }),
  startTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      'string.pattern.base': 'startTime debe tener formato HH:mm',
      'any.required': 'startTime es requerido',
    }),
  endTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      'string.pattern.base': 'endTime debe tener formato HH:mm',
      'any.required': 'endTime es requerido',
    }),
  slotDuration: Joi.number()
    .valid(15, 20, 30)
    .required()
    .messages({
      'any.only': 'slotDuration debe ser exclusivamente 15, 20 o 30 minutos',
      'any.required': 'slotDuration es requerido',
    }),
});

/**
 * Schema para registrar un día libre del doctor.
 * Valida: date (formato YYYY-MM-DD, requerido), reason (string opcional, máx 255 chars).
 * doctor_id es opcional — si no se envía, se usa el ID del usuario autenticado.
 *
 * Validates: Requirements 18.3
 */
const dayOffSchema = Joi.object({
  doctor_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'doctor_id debe ser un UUID válido',
    }),
  date: Joi.string()
    .pattern(dateRegex)
    .required()
    .messages({
      'string.pattern.base': 'date debe tener formato YYYY-MM-DD',
      'any.required': 'date es requerido',
    }),
  reason: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'reason no puede exceder 255 caracteres',
    }),
});

/**
 * Schema para consultar disponibilidad de un doctor.
 * Valida: startDate (ISO date requerido), endDate (ISO date requerido),
 * doctor_id (UUID opcional para query params).
 *
 * Validates: Requirements 18.4
 */
const availabilityQuerySchema = Joi.object({
  startDate: Joi.string()
    .pattern(dateRegex)
    .required()
    .messages({
      'string.pattern.base': 'startDate debe tener formato YYYY-MM-DD',
      'any.required': 'startDate es requerido',
    }),
  endDate: Joi.string()
    .pattern(dateRegex)
    .required()
    .messages({
      'string.pattern.base': 'endDate debe tener formato YYYY-MM-DD',
      'any.required': 'endDate es requerido',
    }),
  doctor_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'doctor_id debe ser un UUID válido',
    }),
});

module.exports = {
  scheduleConfigSchema,
  dayOffSchema,
  availabilityQuerySchema,
};
