const withRole = require('./withRole');

describe('withRole middleware', () => {
  let mockReq;
  let mockRes;
  let mockHandler;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', email: 'test@test.com', role: 'Doctor' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHandler = jest.fn().mockResolvedValue(undefined);
  });

  describe('Autorización exitosa', () => {
    it('debe permitir acceso cuando el rol del usuario está en la lista de roles permitidos', async () => {
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debe permitir acceso cuando el rol del usuario está en una lista con múltiples roles', async () => {
      const wrapped = withRole(['Doctor', 'Secretaria'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('debe permitir acceso a Admin para endpoints de administración', async () => {
      mockReq.user.role = 'Admin';
      const wrapped = withRole(['Admin'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('debe permitir acceso a Paciente para endpoints de paciente', async () => {
      mockReq.user.role = 'Paciente';
      const wrapped = withRole(['Paciente'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('debe permitir acceso a Secretaria para endpoints de agenda', async () => {
      mockReq.user.role = 'Secretaria';
      const wrapped = withRole(['Doctor', 'Secretaria'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  describe('Autorización denegada', () => {
    it('debe rechazar con 403 cuando el rol del usuario no está en la lista permitida', async () => {
      mockReq.user.role = 'Paciente';
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tiene permisos para acceder a este recurso',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar Admin que intenta acceder a Fichas (solo Doctor permitido)', async () => {
      mockReq.user.role = 'Admin';
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tiene permisos para acceder a este recurso',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar Admin que intenta acceder a Recetas (solo Doctor permitido)', async () => {
      mockReq.user.role = 'Admin';
      const wrapped = withRole(['Doctor', 'Paciente'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar Secretaria que intenta acceder a Fichas', async () => {
      mockReq.user.role = 'Secretaria';
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar Secretaria que intenta acceder a Recetas', async () => {
      mockReq.user.role = 'Secretaria';
      const wrapped = withRole(['Doctor', 'Paciente'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Casos edge - usuario sin rol', () => {
    it('debe rechazar con 403 cuando req.user.role es null', async () => {
      mockReq.user.role = null;
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'FORBIDDEN',
        message: 'No tiene permisos para acceder a este recurso',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 403 cuando req.user.role es undefined', async () => {
      delete mockReq.user.role;
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 403 cuando req.user es null', async () => {
      mockReq.user = null;
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 403 cuando req.user es undefined', async () => {
      delete mockReq.user;
      const wrapped = withRole(['Doctor'])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Patrón HOF - estructura correcta', () => {
    it('debe retornar una función al recibir roles', () => {
      const result = withRole(['Doctor']);
      expect(typeof result).toBe('function');
    });

    it('debe retornar una función al recibir el handler', () => {
      const result = withRole(['Doctor'])(mockHandler);
      expect(typeof result).toBe('function');
    });

    it('debe funcionar con array vacío de roles (rechaza todo)', async () => {
      const wrapped = withRole([])(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
