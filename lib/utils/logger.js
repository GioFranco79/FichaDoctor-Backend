/**
 * Logger utility for FichaDoctor Backend
 * Registers HTTP requests and errors, filtering sensitive data from logs.
 *
 * Requirements: 22.1, 22.2, 22.3
 */

// Fields whose VALUES must be redacted from logs
const SENSITIVE_FIELDS = ['password', 'token', 'refresh_token', 'authorization'];

/**
 * Deep-clones an object and replaces values of sensitive fields with '[REDACTED]'.
 * Works recursively on nested objects and arrays.
 * @param {any} data - The data to sanitize
 * @returns {any} Sanitized copy of the data
 */
function sanitize(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Logs an HTTP request with method, path, response code, client IP, and response time.
 * Sensitive data in headers or body is redacted before logging.
 *
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @param {number} responseTime - Response time in milliseconds
 * @returns {Object} The log entry produced
 */
function logRequest(req, res, responseTime) {
  const method = req.method || 'UNKNOWN';
  const path = req.url || req.path || '/';
  const statusCode = res.statusCode || 0;
  const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
  const timestamp = new Date().toISOString();

  const logEntry = {
    type: 'request',
    timestamp,
    method,
    path,
    statusCode,
    ip,
    responseTime,
  };

  // Sanitize and include body/headers context if present (without sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    logEntry.body = sanitize(req.body);
  }

  if (req.headers) {
    logEntry.headers = sanitize(req.headers);
  }

  console.log(JSON.stringify(logEntry));
  return logEntry;
}

/**
 * Logs an error with severity level, message, stack trace (internal), and timestamp.
 * Stack traces are included in the log entry for internal use but should never be
 * exposed to the client.
 *
 * @param {Error|string} error - The error to log
 * @param {string} severity - Severity level ('error', 'warn', 'info', 'critical')
 * @returns {Object} The log entry produced
 */
function logError(error, severity = 'error') {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const logEntry = {
    type: 'error',
    timestamp,
    severity,
    message,
    stack,
  };

  console.error(JSON.stringify(logEntry));
  return logEntry;
}

module.exports = {
  logRequest,
  logError,
  sanitize,
  SENSITIVE_FIELDS,
};
