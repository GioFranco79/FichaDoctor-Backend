/**
 * CORS Middleware - Higher-Order Function para Vercel Serverless
 *
 * Valida el origen de la solicitud contra ALLOWED_ORIGINS en variables de entorno.
 * Rechaza con 403 solicitudes de orígenes no autorizados.
 * Incluye headers de seguridad en todas las respuestas.
 *
 * Uso: export default withCors(handler);
 *
 * Variables de entorno requeridas:
 * - ALLOWED_ORIGINS: lista separada por comas de URLs permitidas
 *   Ejemplo: "http://localhost:3000,https://app.fichadoctor.cl"
 */

const { error } = require('../utils/responseHelper');

/**
 * Obtiene la lista de orígenes permitidos desde variables de entorno
 * @returns {string[]} Array de orígenes permitidos
 */
function getAllowedOrigins() {
  const origins = process.env.ALLOWED_ORIGINS || '';
  return origins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * Aplica headers de seguridad a la respuesta
 * @param {Object} res - Response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

/**
 * Aplica headers CORS a la respuesta
 * @param {Object} res - Response object
 * @param {string} origin - Origen permitido
 */
function setCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Middleware CORS como Higher-Order Function
 * Valida el origen contra la whitelist y maneja preflight requests
 *
 * @param {Function} handler - Handler de la ruta a envolver
 * @returns {Function} Handler envuelto con validación CORS
 */
function withCors(handler) {
  return async (req, res) => {
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = req.headers.origin || '';

    // Aplicar headers de seguridad siempre
    setSecurityHeaders(res);

    // Validar origen
    const isAllowed = allowedOrigins.includes(requestOrigin);

    if (!isAllowed && requestOrigin) {
      return error(res, 'CORS_ERROR', 'Origen no autorizado', 403);
    }

    // Si el origen es permitido, establecer headers CORS
    if (isAllowed) {
      setCorsHeaders(res, requestOrigin);
    }

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(200).end();
    }

    // Ejecutar handler original
    return handler(req, res);
  };
}

module.exports = { withCors, getAllowedOrigins, setSecurityHeaders, setCorsHeaders };
