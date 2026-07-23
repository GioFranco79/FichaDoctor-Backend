const { success, error } = require('./responseHelper');

/**
 * Creates a mock response object that captures status and json calls
 */
function createMockRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._json = body;
      return res;
    }
  };
  return res;
}

describe('responseHelper', () => {
  describe('success()', () => {
    it('should return status 200 by default with success format', () => {
      const res = createMockRes();
      success(res, { id: 1, name: 'Test' });

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: { id: 1, name: 'Test' }
      });
    });

    it('should accept a custom status code', () => {
      const res = createMockRes();
      success(res, { id: 1 }, 201);

      expect(res._status).toBe(201);
      expect(res._json).toEqual({
        success: true,
        data: { id: 1 }
      });
    });

    it('should handle null data', () => {
      const res = createMockRes();
      success(res, null);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: null
      });
    });

    it('should handle array data', () => {
      const res = createMockRes();
      success(res, [1, 2, 3]);

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: [1, 2, 3]
      });
    });

    it('should handle string data', () => {
      const res = createMockRes();
      success(res, 'message');

      expect(res._status).toBe(200);
      expect(res._json).toEqual({
        success: true,
        data: 'message'
      });
    });
  });

  describe('error()', () => {
    it('should return error format with provided status code', () => {
      const res = createMockRes();
      error(res, 'VALIDATION_ERROR', 'Datos inválidos', 400);

      expect(res._status).toBe(400);
      expect(res._json).toEqual({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos'
      });
    });

    it('should return 401 for authentication errors', () => {
      const res = createMockRes();
      error(res, 'AUTH_ERROR', 'No autenticado', 401);

      expect(res._status).toBe(401);
      expect(res._json).toEqual({
        success: false,
        error: 'AUTH_ERROR',
        message: 'No autenticado'
      });
    });

    it('should return 403 for authorization errors', () => {
      const res = createMockRes();
      error(res, 'FORBIDDEN', 'No autorizado', 403);

      expect(res._status).toBe(403);
      expect(res._json).toEqual({
        success: false,
        error: 'FORBIDDEN',
        message: 'No autorizado'
      });
    });

    it('should return 500 for internal errors', () => {
      const res = createMockRes();
      error(res, 'INTERNAL_ERROR', 'Ha ocurrido un error interno', 500);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error interno'
      });
    });

    it('should return 404 for not found errors', () => {
      const res = createMockRes();
      error(res, 'NOT_FOUND', 'Recurso no encontrado', 404);

      expect(res._status).toBe(404);
      expect(res._json).toEqual({
        success: false,
        error: 'NOT_FOUND',
        message: 'Recurso no encontrado'
      });
    });
  });
});
