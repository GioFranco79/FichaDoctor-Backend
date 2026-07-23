const Joi = require('joi');

/**
 * Regex para formato de RUT chileno: XX.XXX.XXX-X
 * Permite 1-2 dígitos antes del primer punto, luego grupos de 3 dígitos, guión y DV (dígito o K/k)
 */
const RUT_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;

/**
 * Schema de registro de usuario
 * Valida: email, password (min 8), first_name, last_name, rut (formato chileno), rol (sin Admin)
 *
 * Requerimientos: 4.1
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email debe ser una dirección de correo válida',
    'any.required': 'El email es obligatorio',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
  first_name: Joi.string().min(2).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'any.required': 'El nombre es obligatorio',
  }),
  last_name: Joi.string().min(2).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'any.required': 'El apellido es obligatorio',
  }),
  rut: Joi.string().pattern(RUT_REGEX).required().messages({
    'string.pattern.base': 'El RUT debe tener formato válido (XX.XXX.XXX-X)',
    'any.required': 'El RUT es obligatorio',
  }),
  role: Joi.string().valid('Doctor', 'Paciente', 'Secretaria').required().messages({
    'any.only': 'El rol debe ser Doctor, Paciente o Secretaria',
    'any.required': 'El rol es obligatorio',
  }),
  direccion: Joi.string().min(5).required().messages({
    'string.min': 'La dirección debe tener al menos 5 caracteres',
    'any.required': 'La dirección es obligatoria',
  }),
  region: Joi.string().required().messages({
    'any.required': 'La región es obligatoria',
  }),
  comuna: Joi.string().required().messages({
    'any.required': 'La comuna es obligatoria',
  }),
  especialidad: Joi.string().when('role', {
    is: 'Doctor',
    then: Joi.string().required().messages({
      'any.required': 'La especialidad es obligatoria para doctores',
    }),
    otherwise: Joi.string().optional().allow('', null),
  }),
  fecha_nacimiento: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'La fecha de nacimiento debe tener formato YYYY-MM-DD',
    'any.required': 'La fecha de nacimiento es obligatoria',
  }),
});

/**
 * Schema de inicio de sesión
 * Valida: email, password
 *
 * Requerimientos: 5.1
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email debe ser una dirección de correo válida',
    'any.required': 'El email es obligatorio',
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es obligatoria',
  }),
});

/**
 * Schema de renovación de token
 * Valida: refresh_token
 *
 * Requerimientos: 6.1
 */
const refreshSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'any.required': 'El refresh token es obligatorio',
  }),
});

/**
 * Schema de solicitud de recuperación de contraseña
 * Valida: email
 *
 * Requerimientos: 7.1
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email debe ser una dirección de correo válida',
    'any.required': 'El email es obligatorio',
  }),
});

/**
 * Schema de restablecimiento de contraseña
 * Valida: token, password (min 8)
 *
 * Requerimientos: 7.3
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token de recuperación es obligatorio',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
});

/**
 * Schema de registro de secretaria por un doctor
 * Valida: email, password (min 8), first_name, last_name, rut (formato chileno)
 * Nota: el rol se asigna automáticamente como 'Secretaria' en el servicio
 *
 * Requerimientos: 19.1
 */
const registerSecretarySchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email debe ser una dirección de correo válida',
    'any.required': 'El email es obligatorio',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
  first_name: Joi.string().required().messages({
    'any.required': 'El nombre es obligatorio',
  }),
  last_name: Joi.string().required().messages({
    'any.required': 'El apellido es obligatorio',
  }),
  rut: Joi.string().pattern(RUT_REGEX).required().messages({
    'string.pattern.base': 'El RUT debe tener formato válido (XX.XXX.XXX-X)',
    'any.required': 'El RUT es obligatorio',
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSecretarySchema,
};
