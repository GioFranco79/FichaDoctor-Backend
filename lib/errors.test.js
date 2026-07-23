const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} = require('./errors');

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with message, statusCode, and errorCode', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with validation details', () => {
      const details = [{ field: 'email', message: 'Email es requerido' }];
      const error = new ValidationError(details);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Datos de entrada inválidos');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create a 401 error with default message', () => {
      const error = new AuthenticationError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No autenticado');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTH_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should allow custom message', () => {
      const error = new AuthenticationError('Token expirado');
      expect(error.message).toBe('Token expirado');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create a 403 error with default message', () => {
      const error = new AuthorizationError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No autorizado');
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
      expect(error.isOperational).toBe(true);
    });

    it('should allow custom message', () => {
      const error = new AuthorizationError('Acceso denegado a fichas');
      expect(error.message).toBe('Acceso denegado a fichas');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with default resource name', () => {
      const error = new NotFoundError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Recurso no encontrado');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.isOperational).toBe(true);
    });

    it('should include custom resource name in message', () => {
      const error = new NotFoundError('Paciente');
      expect(error.message).toBe('Paciente no encontrado');
    });
  });

  describe('ConflictError', () => {
    it('should create a 409 error with provided message', () => {
      const error = new ConflictError('El email ya está registrado');
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('El email ya está registrado');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
      expect(error.isOperational).toBe(true);
    });
  });
});
