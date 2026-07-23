/**
 * Response Helper - Utilidad para respuestas HTTP estándar
 *
 * Todas las respuestas de la API siguen un formato consistente:
 * - Éxito: { success: true, data: ... }
 * - Error: { success: false, error: "ERROR_CODE", message: "Human-readable message" }
 */

/**
 * Retorna respuesta exitosa estándar
 * @param {Object} res - Response object
 * @param {any} data - Datos a retornar
 * @param {number} statusCode - Código HTTP (default 200)
 * @returns {Object} Response con formato { success: true, data }
 */
function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * Retorna respuesta de error estándar
 * @param {Object} res - Response object
 * @param {string} errorCode - Código de error interno
 * @param {string} message - Mensaje legible para el cliente
 * @param {number} statusCode - Código HTTP
 * @returns {Object} Response con formato { success: false, error, message }
 */
function error(res, errorCode, message, statusCode) {
  return res.status(statusCode).json({
    success: false,
    error: errorCode,
    message
  });
}

module.exports = { success, error };
