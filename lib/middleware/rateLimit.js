/**
 * Rate Limiting Middleware - Higher-Order Function para Vercel Serverless
 *
 * Limita la tasa de solicitudes por IP para proteger contra ataques de fuerza bruta y abuso.
 *
 * - Límite general: 100 solicitudes por minuto por IP
 * - Límite estricto (auth): 10 solicitudes por minuto por IP
 *
 * Uso:
 *   withRateLimit(handler)                           // Límite general: 100 req/min
 *   withRateLimit(handler, { limit: 10, windowMs: 60000 })  // Límite estricto: 10 req/min
 *
 * NOTA: Este store en memoria funciona para desarrollo pero NO persiste entre
 * invocaciones serverless en producción. Para producción, usar Upstash Redis:
 *   - @upstash/redis para persistencia entre invocaciones
 *   - Configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en env vars
 */

const { error } = require('../utils/responseHelper');

// In-memory store para rate limiting (desarrollo)
// En producción reemplazar por Upstash Redis para persistencia entre invocaciones serverless
const store = new Map();

/**
 * Obtiene la dirección IP del cliente
 * @param {Object} req - Request object
 * @returns {string} Dirección IP del cliente
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for puede contener múltiples IPs separadas por coma
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

/**
 * Limpia entradas expiradas del store para evitar memory leaks
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetTime) {
      store.delete(key);
    }
  }
}

/**
 * Higher-Order Function para rate limiting
 * @param {Function} handler - El handler de la ruta a proteger
 * @param {Object} options - Opciones de configuración
 * @param {number} options.limit - Número máximo de solicitudes permitidas en la ventana (default: 100)
 * @param {number} options.windowMs - Ventana de tiempo en milisegundos (default: 60000 = 1 minuto)
 * @returns {Function} Handler envuelto con rate limiting
 */
function withRateLimit(handler, options = {}) {
  const { limit = 100, windowMs = 60000 } = options;

  return async function rateLimitedHandler(req, res) {
    const ip = getClientIp(req);
    const key = `${ip}:${limit}:${windowMs}`;
    const now = Date.now();

    // Limpieza periódica de entradas expiradas
    cleanupExpiredEntries();

    let entry = store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Primera solicitud o ventana expirada: crear nueva entrada
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      store.set(key, entry);
    } else {
      // Incrementar contador dentro de la ventana activa
      entry.count += 1;
    }

    if (entry.count > limit) {
      // Solicitud excede el límite: retornar 429
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return error(
        res,
        'RATE_LIMIT_EXCEEDED',
        'Demasiadas solicitudes. Por favor intente nuevamente más tarde.',
        429
      );
    }

    // Solicitud permitida: ejecutar handler
    return handler(req, res);
  };
}

/**
 * Variante preconfigurada para rutas de autenticación (10 req/min)
 * @param {Function} handler - El handler de la ruta a proteger
 * @returns {Function} Handler envuelto con rate limiting estricto
 */
function withAuthRateLimit(handler) {
  return withRateLimit(handler, { limit: 10, windowMs: 60000 });
}

// Exponer store para testing
withRateLimit._store = store;
withRateLimit._getClientIp = getClientIp;

module.exports = { withRateLimit, withAuthRateLimit };
