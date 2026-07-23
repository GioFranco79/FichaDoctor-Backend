const Joi = require('joi');

/**
 * Schema para un medicamento individual dentro de una receta.
 *
 * Campos:
 * - name: Nombre del medicamento (requerido, string)
 * - dosage: Dosis (requerido, string)
 * - frequency: Frecuencia de administración (requerido, string)
 * - duration: Duración del tratamiento (requerido, string)
 */
const medicationSchema = Joi.object({
  name: Joi.string().min(1).required().messages({
    'string.min': 'El nombre del medicamento debe tener al menos 1 carácter',
    'string.empty': 'El nombre del medicamento no puede estar vacío',
    'any.required': 'El campo nombre del medicamento es requerido',
  }),
  dosage: Joi.string().min(1).required().messages({
    'string.min': 'La dosis debe tener al menos 1 carácter',
    'string.empty': 'La dosis no puede estar vacía',
    'any.required': 'El campo dosis es requerido',
  }),
  frequency: Joi.string().min(1).required().messages({
    'string.min': 'La frecuencia debe tener al menos 1 carácter',
    'string.empty': 'La frecuencia no puede estar vacía',
    'any.required': 'El campo frecuencia es requerido',
  }),
  duration: Joi.string().min(1).required().messages({
    'string.min': 'La duración debe tener al menos 1 carácter',
    'string.empty': 'La duración no puede estar vacía',
    'any.required': 'El campo duración es requerido',
  }),
});

/**
 * Schema para crear una receta médica.
 *
 * Campos:
 * - patient_id: UUID del paciente (requerido)
 * - medications: Array de medicamentos (requerido, mínimo 1 elemento)
 * - instructions: Indicaciones generales (opcional, string)
 */
const createPrescriptionSchema = Joi.object({
  patient_id: Joi.string().uuid().required().messages({
    'string.guid': 'El campo patient_id debe ser un UUID válido',
    'any.required': 'El campo patient_id es requerido',
  }),
  medications: Joi.array().items(medicationSchema).min(1).required().messages({
    'array.min': 'Debe incluir al menos 1 medicamento',
    'array.base': 'El campo medicamentos debe ser un array',
    'any.required': 'El campo medicamentos es requerido',
  }),
  instructions: Joi.string().allow('').optional(),
});

module.exports = {
  createPrescriptionSchema,
};
