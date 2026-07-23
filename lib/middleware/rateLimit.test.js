/**
 * Tests unitarios para el middleware de Rate Limiting
 * Valida: Requerimientos 3.1, 3.2, 3.3
 */

const { withRateLimit, withAuthRateLimit } = require('./rateLimit');

// Helper para crear mock req/res
function createMockReq(ip = '192.168.1.1', headers = {}) {
  return {
    headers: { ...headers },
    socket: { remoteAddress: ip }
  };
}

function createMockRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
    setHeader(name, value) {
      res.headers[name] = value;
      return res;
    }
  };
  return res;
}

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Limpiar el store entre tests
    withRateLimit._store.clear();
  });

  describe('withRateLimit - Límite general (100 req/min)', () => {
    test('permite solicitudes dentro del límite', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler);

      const req = createMockReq('10.0.0.1');
      const res = createMockRes();

      await limited(req, res);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
    });

    test('permite exactamente 100 solicitudes por minuto por IP', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler);

      for (let i = 0; i < 100; i++) {
        const req = createMockReq('10.0.0.2');
        const res = createMockRes();
        await limited(req, res);
      }

      expect(handler).toHaveBeenCalledTimes(100);
    });

    test('rechaza la solicitud 101 con código 429', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler);

      // Hacer 100 solicitudes válidas
      for (let i = 0; i < 100; i++) {
        const req = createMockReq('10.0.0.3');
        const res = createMockRes();
        await limited(req, res);
      }

      // La solicitud 101 debe ser rechazada
      const req = createMockReq('10.0.0.3');
      const res = createMockRes();
      await limited(req, res);

      expect(handler).toHaveBeenCalledTimes(100);
      expect(res.statusCode).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('incluye header Retry-After al rechazar', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 1, windowMs: 60000 });

      // Primera solicitud OK
      const req1 = createMockReq('10.0.0.4');
      const res1 = createMockRes();
      await limited(req1, res1);

      // Segunda solicitud rechazada
      const req2 = createMockReq('10.0.0.4');
      const res2 = createMockRes();
      await limited(req2, res2);

      expect(res2.statusCode).toBe(429);
      expect(res2.headers['Retry-After']).toBeDefined();
      const retryAfter = parseInt(res2.headers['Retry-After']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    test('IPs diferentes tienen contadores independientes', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 2 });

      // IP A hace 2 solicitudes (alcanza límite)
      for (let i = 0; i < 2; i++) {
        await limited(createMockReq('10.0.0.10'), createMockRes());
      }

      // IP B aún puede hacer solicitudes
      const req = createMockReq('10.0.0.11');
      const res = createMockRes();
      await limited(req, res);

      expect(res.statusCode).toBe(200);
    });

    test('resetea el contador después de que expira la ventana', async () => {
      jest.useFakeTimers();

      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 2, windowMs: 60000 });

      // Agotar el límite
      await limited(createMockReq('10.0.0.20'), createMockRes());
      await limited(createMockReq('10.0.0.20'), createMockRes());

      // Verificar que está bloqueado
      const resBlocked = createMockRes();
      await limited(createMockReq('10.0.0.20'), resBlocked);
      expect(resBlocked.statusCode).toBe(429);

      // Avanzar el tiempo más allá de la ventana
      jest.advanceTimersByTime(61000);

      // Ahora debe permitir de nuevo
      const resAllowed = createMockRes();
      await limited(createMockReq('10.0.0.20'), resAllowed);
      expect(resAllowed.statusCode).toBe(200);

      jest.useRealTimers();
    });
  });

  describe('withRateLimit - Opciones personalizadas', () => {
    test('respeta límite personalizado', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 5 });

      for (let i = 0; i < 5; i++) {
        await limited(createMockReq('10.0.0.30'), createMockRes());
      }

      const res = createMockRes();
      await limited(createMockReq('10.0.0.30'), res);
      expect(res.statusCode).toBe(429);
      expect(handler).toHaveBeenCalledTimes(5);
    });
  });

  describe('withAuthRateLimit - Límite estricto (10 req/min)', () => {
    test('permite exactamente 10 solicitudes por minuto', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withAuthRateLimit(handler);

      for (let i = 0; i < 10; i++) {
        await limited(createMockReq('10.0.0.40'), createMockRes());
      }

      expect(handler).toHaveBeenCalledTimes(10);
    });

    test('rechaza la solicitud 11 con código 429', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withAuthRateLimit(handler);

      for (let i = 0; i < 10; i++) {
        await limited(createMockReq('10.0.0.41'), createMockRes());
      }

      const res = createMockRes();
      await limited(createMockReq('10.0.0.41'), res);

      expect(handler).toHaveBeenCalledTimes(10);
      expect(res.statusCode).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.headers['Retry-After']).toBeDefined();
    });
  });

  describe('Detección de IP', () => {
    test('usa x-forwarded-for cuando está presente', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 1 });

      // Primera solicitud con x-forwarded-for
      const req1 = createMockReq('127.0.0.1', { 'x-forwarded-for': '203.0.113.50' });
      await limited(req1, createMockRes());

      // Segunda solicitud desde el mismo forwarded IP debe ser rechazada
      const req2 = createMockReq('127.0.0.1', { 'x-forwarded-for': '203.0.113.50' });
      const res2 = createMockRes();
      await limited(req2, res2);

      expect(res2.statusCode).toBe(429);
    });

    test('usa la primera IP de x-forwarded-for cuando hay múltiples', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 1 });

      const req1 = createMockReq('127.0.0.1', { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' });
      await limited(req1, createMockRes());

      // Misma primera IP → debe bloquear
      const req2 = createMockReq('127.0.0.1', { 'x-forwarded-for': '203.0.113.50, 99.99.99.99' });
      const res2 = createMockRes();
      await limited(req2, res2);

      expect(res2.statusCode).toBe(429);
    });

    test('usa socket.remoteAddress cuando x-forwarded-for no existe', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 1 });

      const req1 = createMockReq('192.168.1.100');
      await limited(req1, createMockRes());

      const req2 = createMockReq('192.168.1.100');
      const res2 = createMockRes();
      await limited(req2, res2);

      expect(res2.statusCode).toBe(429);
    });
  });

  describe('Formato de respuesta 429', () => {
    test('retorna formato de error estándar al exceder límite', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ success: true }));
      const limited = withRateLimit(handler, { limit: 1 });

      await limited(createMockReq('10.0.0.50'), createMockRes());

      const res = createMockRes();
      await limited(createMockReq('10.0.0.50'), res);

      expect(res.statusCode).toBe(429);
      expect(res.body).toEqual({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes. Por favor intente nuevamente más tarde.'
      });
    });
  });
});
