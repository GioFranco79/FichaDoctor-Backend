/**
 * Error Handler Middleware (withErrorHandler)
 *
 * Higher-Order Function that wraps an API handler with global error handling.
 * - Captures all errors thrown by the handler
 * - For operational errors (AppError): returns the appropriate statusCode, errorCode, and message
 * - For unexpected errors: logs internally and returns a generic 500 response
 * - NEVER exposes: stack traces, SQL queries, or filesystem paths
 *
 * Requirements: 21.1, 21.3
 */

const { AppError, ValidationError } = require('../errors');
const { error } = require('../utils/responseHelper');
const { logError } = require('../utils/logger');

/**
 * Wraps an API handler to provide global error handling.
 * @param {Function} handler - The API route handler (req, res) => Promise<void>
 * @returns {Function} Wrapped handler with error catching
 */
function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      // Operational errors (AppError) — safe to expose to client
      if (err instanceof AppError && err.isOperational) {
        const response = {
          success: false,
          error: err.errorCode,
          message: err.message,
        };

        // For ValidationError, include the details array
        if (err instanceof ValidationError && err.details) {
          response.details = err.details;
        }

        return res.status(err.statusCode).json(response);
      }

      // Unexpected/programming errors — log internally, return generic response
      logError(err, 'critical');

      return error(
        res,
        'INTERNAL_ERROR',
        'Ha ocurrido un error interno. Por favor intente nuevamente.',
        500
      );
    }
  };
}

module.exports = { withErrorHandler };
