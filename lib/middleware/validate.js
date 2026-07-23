/**
 * Middleware de validación de schemas - validate
 *
 * HOF que valida body/query contra esquemas Joi.
 * Retorna código 400 con detalles de validación cuando el input es inválido.
 *
 * Uso:
 *   validate(schema)(handler)           // valida req.body por defecto
 *   validate(schema, 'query')(handler)  // valida req.query
 *
 * @param {Object} schema - Esquema Joi para validación
 * @param {string} source - Fuente de datos a validar: 'body' o 'query' (default: 'body')
 * @returns {Function} Handler envuelto con validación
 */
function validate(schema, source = 'body') {
  return function (handler) {
    return async function (req, res) {
      const data = req[source] || {};

      const { error, value } = schema.validate(data, { abortEarly: false });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          details,
        });
      }

      // Replace the source data with the validated/sanitized value
      req[source] = value;

      return handler(req, res);
    };
  };
}

module.exports = validate;
