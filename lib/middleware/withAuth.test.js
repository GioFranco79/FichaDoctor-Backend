const withAuth = require('./withAuth');

// Mock supabaseClient
jest.mock('../supabaseClient', () => ({
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}));

const supabase = require('../supabaseClient');

describe('withAuth middleware', () => {
  let mockReq;
  let mockRes;
  let mockHandler;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHandler = jest.fn().mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  describe('Token ausente o malformado', () => {
    it('debe rechazar con 401 cuando no hay header Authorization', async () => {
      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token de autenticación requerido',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 401 cuando el header Authorization no tiene formato Bearer', async () => {
      mockReq.headers.authorization = 'Basic abc123';
      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token de autenticación requerido',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 401 cuando el token está vacío después de Bearer', async () => {
      mockReq.headers.authorization = 'Bearer ';
      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Token inválido o expirado', () => {
    it('debe rechazar con 401 cuando Supabase retorna error de autenticación', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(supabase.auth.getUser).toHaveBeenCalledWith('invalid-token');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token inválido o expirado',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('debe rechazar con 401 cuando Supabase retorna user null sin error', async () => {
      mockReq.headers.authorization = 'Bearer expired-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Token válido con perfil en tabla users', () => {
    const mockUser = {
      id: 'user-123',
      email: 'doctor@test.com',
      user_metadata: { role: 'Doctor' },
    };

    const mockProfile = {
      id: 'user-123',
      email: 'doctor@test.com',
      role: 'Doctor',
      first_name: 'Juan',
      last_name: 'Pérez',
      is_active: true,
    };

    it('debe adjuntar datos del usuario a req.user y llamar al handler', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'doctor@test.com',
        role: 'Doctor',
        first_name: 'Juan',
        last_name: 'Pérez',
      });
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('debe rechazar con 401 si la cuenta del usuario está deshabilitada', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockProfile, is_active: false },
              error: null,
            }),
          }),
        }),
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Cuenta deshabilitada',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Token válido sin perfil en tabla users (fallback a metadata)', () => {
    const mockUser = {
      id: 'user-456',
      email: 'new@test.com',
      user_metadata: { role: 'Paciente' },
    };

    it('debe usar metadata del JWT si no hay perfil en la tabla users', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockReq.user).toEqual({
        id: 'user-456',
        email: 'new@test.com',
        role: 'Paciente',
      });
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('debe asignar role null si no hay metadata de rol', async () => {
      const userWithoutRole = {
        id: 'user-789',
        email: 'norole@test.com',
        user_metadata: {},
      };
      mockReq.headers.authorization = 'Bearer valid-token';
      supabase.auth.getUser.mockResolvedValue({
        data: { user: userWithoutRole },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockReq.user).toEqual({
        id: 'user-789',
        email: 'norole@test.com',
        role: null,
      });
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Manejo de errores inesperados', () => {
    it('debe retornar 401 si ocurre una excepción durante la verificación', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      supabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Error de autenticación',
      });
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Variantes del header Authorization', () => {
    it('debe funcionar con header Authorization en mayúscula', async () => {
      mockReq.headers.Authorization = 'Bearer valid-token';
      const mockUser = {
        id: 'user-100',
        email: 'user@test.com',
        user_metadata: { role: 'Admin' },
      };
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-100',
                email: 'user@test.com',
                role: 'Admin',
                first_name: 'Admin',
                last_name: 'User',
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const wrapped = withAuth(mockHandler);
      await wrapped(mockReq, mockRes);

      expect(mockReq.user.id).toBe('user-100');
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
