/**
 * Tests for withErrorHandler middleware
 * Requirements: 21.1, 21.3
 */

const { withErrorHandler } = require('./errorHandler');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} = require('../errors');

// Mock logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  logError: jest.fn(),
}));

const { logError } = require('../utils/logger');

/**
 * Creates a mock response object
 */
function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Creates a mock request object
 */
function createMockReq() {
  return { method: 'GET', url: '/test' };
}

describe('withErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful handler execution', () => {
    it('should call the handler normally when no error is thrown', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('operational errors (AppError)', () => {
    it('should return statusCode and message for AppError', async () => {
      const handler = jest.fn().mockRejectedValue(
        new AppError('Recurso no disponible', 400, 'RESOURCE_UNAVAILABLE')
      );
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'RESOURCE_UNAVAILABLE',
        message: 'Recurso no disponible',
      });
    });

    it('should return 401 for AuthenticationError', async () => {
      const handler = jest.fn().mockRejectedValue(new AuthenticationError());
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'No autenticado',
      });
    });

    it('should return 403 for AuthorizationError', async () => {
      const handler = jest.fn().mockRejectedValue(new AuthorizationError());
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'FORBIDDEN',
        message: 'No autorizado',
      });
    });

    it('should return 404 for NotFoundError', async () => {
      const handler = jest.fn().mockRejectedValue(new NotFoundError('Paciente'));
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'NOT_FOUND',
        message: 'Paciente no encontrado',
      });
    });

    it('should return 409 for ConflictError', async () => {
      const handler = jest.fn().mockRejectedValue(
        new ConflictError('El horario ya está ocupado')
      );
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CONFLICT',
        message: 'El horario ya está ocupado',
      });
    });

    it('should include details for ValidationError', async () => {
      const details = [
        { field: 'email', message: 'Email es requerido' },
        { field: 'rut', message: 'RUT inválido' },
      ];
      const handler = jest.fn().mockRejectedValue(new ValidationError(details));
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details,
      });
    });
  });

  describe('unexpected errors (non-operational)', () => {
    it('should return generic 500 response for unexpected errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Unexpected DB error'));
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error interno. Por favor intente nuevamente.',
      });
    });

    it('should log unexpected errors with critical severity', async () => {
      const unexpectedError = new Error('Connection refused');
      const handler = jest.fn().mockRejectedValue(unexpectedError);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(logError).toHaveBeenCalledWith(unexpectedError, 'critical');
    });

    it('should NOT expose stack traces in the response', async () => {
      const err = new Error('TypeError at /home/user/app/lib/services/authService.js:45');
      err.stack = 'Error: TypeError\n    at /home/user/app/lib/services/authService.js:45:12\n    at processTicksAndRejections';
      const handler = jest.fn().mockRejectedValue(err);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      const jsonResponse = res.json.mock.calls[0][0];
      const responseStr = JSON.stringify(jsonResponse);
      expect(responseStr).not.toContain('at /home/user');
      expect(responseStr).not.toContain('authService.js');
      expect(responseStr).not.toContain('processTicksAndRejections');
    });

    it('should NOT expose SQL queries in the response', async () => {
      const err = new Error('SELECT * FROM users WHERE email = "admin@test.com"');
      const handler = jest.fn().mockRejectedValue(err);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      const jsonResponse = res.json.mock.calls[0][0];
      const responseStr = JSON.stringify(jsonResponse);
      expect(responseStr).not.toContain('SELECT');
      expect(responseStr).not.toContain('FROM users');
      expect(responseStr).not.toContain('admin@test.com');
    });

    it('should NOT expose internal filesystem paths in the response', async () => {
      const err = new Error('ENOENT: no such file at /var/app/current/lib/data/config.json');
      const handler = jest.fn().mockRejectedValue(err);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      const jsonResponse = res.json.mock.calls[0][0];
      const responseStr = JSON.stringify(jsonResponse);
      expect(responseStr).not.toContain('/var/app');
      expect(responseStr).not.toContain('config.json');
      expect(responseStr).not.toContain('ENOENT');
    });

    it('should NOT log operational errors to logger', async () => {
      const handler = jest.fn().mockRejectedValue(new NotFoundError('Cita'));
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(logError).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle thrown string errors', async () => {
      const handler = jest.fn().mockRejectedValue('something went wrong');
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error interno. Por favor intente nuevamente.',
      });
    });

    it('should handle synchronous throw inside handler', async () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error interno. Por favor intente nuevamente.',
      });
    });

    it('should handle null/undefined errors gracefully', async () => {
      const handler = jest.fn().mockRejectedValue(null);
      const wrapped = withErrorHandler(handler);
      const req = createMockReq();
      const res = createMockRes();

      await wrapped(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error interno. Por favor intente nuevamente.',
      });
    });
  });
});
