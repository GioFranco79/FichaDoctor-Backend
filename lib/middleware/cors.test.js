/**
 * Tests para CORS Middleware
 * Valida: Requerimientos 2.1, 2.2, 2.3
 */

const { withCors, getAllowedOrigins, setSecurityHeaders, setCorsHeaders } = require('./cors');

// Helper para crear mock req/res
function createMockReq({ origin = '', method = 'GET' } = {}) {
  return {
    headers: { origin },
    method
  };
}

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: null,
    body: null,
    headers,
    setHeader: jest.fn((key, value) => {
      headers[key] = value;
    }),
    status: jest.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(function (data) {
      res.body = data;
      return res;
    }),
    end: jest.fn(function () {
      return res;
    })
  };
  return res;
}

describe('CORS Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://app.fichadoctor.cl';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAllowedOrigins', () => {
    it('debe parsear orígenes separados por coma desde variables de entorno', () => {
      const origins = getAllowedOrigins();
      expect(origins).toEqual(['http://localhost:3000', 'https://app.fichadoctor.cl']);
    });

    it('debe retornar array vacío si ALLOWED_ORIGINS no está definido', () => {
      delete process.env.ALLOWED_ORIGINS;
      const origins = getAllowedOrigins();
      expect(origins).toEqual([]);
    });

    it('debe eliminar espacios en blanco alrededor de los orígenes', () => {
      process.env.ALLOWED_ORIGINS = ' http://localhost:3000 , https://app.fichadoctor.cl ';
      const origins = getAllowedOrigins();
      expect(origins).toEqual(['http://localhost:3000', 'https://app.fichadoctor.cl']);
    });

    it('debe filtrar entradas vacías', () => {
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,,https://app.fichadoctor.cl,';
      const origins = getAllowedOrigins();
      expect(origins).toEqual(['http://localhost:3000', 'https://app.fichadoctor.cl']);
    });
  });

  describe('setSecurityHeaders', () => {
    it('debe incluir X-Content-Type-Options: nosniff', () => {
      const res = createMockRes();
      setSecurityHeaders(res);
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('debe incluir X-Frame-Options: DENY', () => {
      const res = createMockRes();
      setSecurityHeaders(res);
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('debe incluir X-XSS-Protection: 1; mode=block', () => {
      const res = createMockRes();
      setSecurityHeaders(res);
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });
  });

  describe('withCors - Validación de origen', () => {
    it('debe rechazar con 403 solicitudes de orígenes no autorizados', async () => {
      const handler = jest.fn();
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://malicious-site.com' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body).toEqual({
        success: false,
        error: 'CORS_ERROR',
        message: 'Origen no autorizado'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('debe permitir solicitudes de orígenes autorizados', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
    });

    it('debe permitir solicitudes sin header origin (ej: server-to-server)', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: '' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
    });
  });

  describe('withCors - Headers CORS', () => {
    it('debe establecer Access-Control-Allow-Origin al origen permitido', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'https://app.fichadoctor.cl' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.fichadoctor.cl');
    });

    it('debe incluir Access-Control-Allow-Methods', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
    });

    it('debe incluir Access-Control-Allow-Credentials', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('withCors - Preflight OPTIONS', () => {
    it('debe responder 200 a solicitudes OPTIONS de orígenes permitidos', async () => {
      const handler = jest.fn();
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000', method: 'OPTIONS' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('debe incluir Access-Control-Max-Age en preflight', async () => {
      const handler = jest.fn();
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000', method: 'OPTIONS' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    });

    it('debe rechazar preflight de orígenes no autorizados', async () => {
      const handler = jest.fn();
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://evil.com', method: 'OPTIONS' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('withCors - Headers de seguridad', () => {
    it('debe incluir headers de seguridad en solicitudes permitidas', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://localhost:3000' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('debe incluir headers de seguridad incluso en respuestas 403', async () => {
      const handler = jest.fn();
      const wrappedHandler = withCors(handler);

      const req = createMockReq({ origin: 'http://evil.com' });
      const res = createMockRes();

      await wrappedHandler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });
  });
});
