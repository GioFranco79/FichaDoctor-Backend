const Joi = require('joi');
const validate = require('./validate');

// Helper to create mock req/res
function createMocks(data = {}, source = 'body') {
  const req = { body: {}, query: {} };
  req[source] = data;

  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  return { req, res };
}

describe('validate middleware', () => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required(),
    age: Joi.number().integer().min(0),
  });

  describe('valid input', () => {
    it('should call the handler when body is valid', async () => {
      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrapped = validate(schema)(handler);

      const { req, res } = createMocks({ email: 'test@example.com', name: 'Juan' });

      await wrapped(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should pass sanitized values to the handler', async () => {
      const schemaWithDefaults = Joi.object({
        email: Joi.string().email().required(),
        role: Joi.string().default('Paciente'),
      });

      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrapped = validate(schemaWithDefaults)(handler);

      const { req, res } = createMocks({ email: 'test@example.com' });

      await wrapped(req, res);

      expect(req.body.role).toBe('Paciente');
      expect(handler).toHaveBeenCalled();
    });

    it('should strip unknown fields when schema allows it', async () => {
      const strictSchema = Joi.object({
        email: Joi.string().email().required(),
      }).options({ stripUnknown: true });

      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrapped = validate(strictSchema)(handler);

      const { req, res } = createMocks({ email: 'test@example.com', extra: 'should be removed' });

      await wrapped(req, res);

      expect(req.body.extra).toBeUndefined();
      expect(req.body.email).toBe('test@example.com');
    });
  });

  describe('invalid input', () => {
    it('should return 400 when required fields are missing', async () => {
      const handler = jest.fn();
      const wrapped = validate(schema)(handler);

      const { req, res } = createMocks({});

      await wrapped(req, res);

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toBe('Datos de entrada inválidos');
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should include all validation errors (abortEarly: false)', async () => {
      const handler = jest.fn();
      const wrapped = validate(schema)(handler);

      const { req, res } = createMocks({});

      await wrapped(req, res);

      // Both email and name are required, so at least 2 errors
      const fields = res.body.details.map((d) => d.field);
      expect(fields).toContain('email');
      expect(fields).toContain('name');
    });

    it('should return correct field path for nested objects', async () => {
      const nestedSchema = Joi.object({
        address: Joi.object({
          city: Joi.string().required(),
          zip: Joi.string().required(),
        }).required(),
      });

      const handler = jest.fn();
      const wrapped = validate(nestedSchema)(handler);

      const { req, res } = createMocks({ address: {} });

      await wrapped(req, res);

      expect(res.statusCode).toBe(400);
      const fields = res.body.details.map((d) => d.field);
      expect(fields).toContain('address.city');
      expect(fields).toContain('address.zip');
    });

    it('should return correct error for invalid types', async () => {
      const handler = jest.fn();
      const wrapped = validate(schema)(handler);

      const { req, res } = createMocks({ email: 'not-an-email', name: 'Juan' });

      await wrapped(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.details.some((d) => d.field === 'email')).toBe(true);
    });
  });

  describe('query source', () => {
    it('should validate req.query when source is "query"', async () => {
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).required(),
        limit: Joi.number().integer().min(1).max(100).required(),
      });

      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrapped = validate(querySchema, 'query')(handler);

      const { req, res } = createMocks({ page: 1, limit: 10 }, 'query');

      await wrapped(req, res);

      expect(handler).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid query params', async () => {
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).required(),
      });

      const handler = jest.fn();
      const wrapped = validate(querySchema, 'query')(handler);

      const { req, res } = createMocks({ page: -1 }, 'query');

      await wrapped(req, res);

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined source gracefully', async () => {
      const handler = jest.fn();
      const wrapped = validate(schema)(handler);

      const req = { body: undefined, query: {} };
      const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
      };

      await wrapped(req, res);

      // Should attempt validation on empty object and fail for required fields
      expect(res.statusCode).toBe(400);
    });

    it('should default to body when no source specified', async () => {
      const simpleSchema = Joi.object({
        value: Joi.string().required(),
      });

      const handler = jest.fn((req, res) => res.status(200).json({ ok: true }));
      const wrapped = validate(simpleSchema)(handler);

      const { req, res } = createMocks({ value: 'test' });

      await wrapped(req, res);

      expect(handler).toHaveBeenCalled();
    });
  });
});
