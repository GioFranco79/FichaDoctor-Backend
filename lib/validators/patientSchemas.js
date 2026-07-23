/**
 * Patient Validation Schemas
 *
 * Esquemas Joi para validación de datos de pacientes.
 * Incluye validación de RUT chileno mediante rutValidator.
 *
 * Schemas exportados:
 * - createPatientSchema: Para creación de paciente (campos requeridos: first_name, last_name, rut)
 * - updatePatientSchema: Para actualización de paciente (todos opcionales, mínimo uno requerido)
 */

const Joi = require('joi');
const { validateRut } = require('../utils/rutValidator');

/**
 * Campo personalizado de RUT con validación mediante rutValidator
 * Verifica que el valor cumpla con el formato chileno XX.XXX.XXX-X
 * y que el dígito verificador sea correcto (algoritmo módulo 11).
 */
const rutField = Joi.string().custom((value, helpers) => {
  if (!validateRut(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'El RUT proporcionado no es válido',
  'string.empty': 'El RUT es requerido'
});

/**
 * Schema para creación de paciente
 *
 * Campos requeridos: first_name, last_name, rut
 * Campos opcionales: email, phone, birth_date, gender, address, city, insurance
 */
const createPatientSchema = Joi.object({
  first_name: Joi.string().min(2).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'any.required': 'El nombre es requerido',
    'string.empty': 'El nombre es requerido'
  }),
  last_name: Joi.string().min(2).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'any.required': 'El apellido es requerido',
    'string.empty': 'El apellido es requerido'
  }),
  rut: rutField.required().messages({
    'any.required': 'El RUT es requerido'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'El email proporcionado no es válido'
  }),
  phone: Joi.string().optional(),
  birth_date: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'La fecha de nacimiento debe estar en formato ISO (YYYY-MM-DD)'
  }),
  gender: Joi.string().valid('masculino', 'femenino', 'otro').optional().messages({
    'any.only': 'El género debe ser: masculino, femenino u otro'
  }),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  insurance: Joi.string().optional()
});

/**
 * Schema para actualización de paciente
 *
 * Todos los campos son opcionales pero al menos uno debe estar presente.
 */
const updatePatientSchema = Joi.object({
  first_name: Joi.string().min(2).optional().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres'
  }),
  last_name: Joi.string().min(2).optional().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres'
  }),
  rut: rutField.optional(),
  email: Joi.string().email().optional().messages({
    'string.email': 'El email proporcionado no es válido'
  }),
  phone: Joi.string().optional(),
  birth_date: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'La fecha de nacimiento debe estar en formato ISO (YYYY-MM-DD)'
  }),
  gender: Joi.string().valid('masculino', 'femenino', 'otro').optional().messages({
    'any.only': 'El género debe ser: masculino, femenino u otro'
  }),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  insurance: Joi.string().optional()
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

module.exports = { createPatientSchema, updatePatientSchema };
