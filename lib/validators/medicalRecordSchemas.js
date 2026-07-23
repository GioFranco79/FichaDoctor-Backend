const Joi = require('joi');

/**
 * Schema para crear una ficha médica.
 *
 * Campos:
 * - patient_id: UUID del paciente (requerido)
 * - diagnosis: Diagnóstico (requerido, string, mínimo 1 carácter)
 * - clinical_notes: Notas clínicas (opcional, string)
 * - background: Antecedentes (opcional, string)
 */
const createMedicalRecordSchema = Joi.object({
  patient_id: Joi.string().uuid().required().messages({
    'string.guid': 'El campo patient_id debe ser un UUID válido',
    'any.required': 'El campo patient_id es requerido',
  }),
  appointment_id: Joi.string().uuid().optional().messages({
    'string.guid': 'El campo appointment_id debe ser un UUID válido',
  }),
  diagnosis: Joi.string().min(1).required().messages({
    'string.min': 'El diagnóstico debe tener al menos 1 carácter',
    'string.empty': 'El diagnóstico no puede estar vacío',
    'any.required': 'El campo diagnóstico es requerido',
  }),
  clinical_notes: Joi.string().allow('').optional(),
  background: Joi.string().allow('').optional(),
});

/**
 * Schema para actualizar una ficha médica.
 *
 * Campos (todos opcionales, pero al menos uno requerido):
 * - diagnosis: Diagnóstico (opcional, string)
 * - clinical_notes: Notas clínicas (opcional, string)
 * - background: Antecedentes (opcional, string)
 */
const updateMedicalRecordSchema = Joi.object({
  diagnosis: Joi.string().min(1).optional().messages({
    'string.min': 'El diagnóstico debe tener al menos 1 carácter',
    'string.empty': 'El diagnóstico no puede estar vacío',
  }),
  clinical_notes: Joi.string().allow('').optional(),
  background: Joi.string().allow('').optional(),
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar',
});

module.exports = {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
};
