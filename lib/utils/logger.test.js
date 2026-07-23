/**
 * Unit tests for Logger utility
 * Validates: Requirements 22.1, 22.2, 22.3
 */

const { logRequest, logError, sanitize, SENSITIVE_FIELDS } = require('./logger');

describe('Logger - sanitize', () => {
  it('should redact password field', () => {
    const data = { email: 'test@mail.com', password: 'secret123' };
    const result = sanitize(data);
    expect(result.email).toBe('test@mail.com');
    expect(result.password).toBe('[REDACTED]');
  });

  it('should redact token field', () => {
    const data = { user: 'admin', token: 'jwt-abc-123' };
    const result = sanitize(data);
    expect(result.user).toBe('admin');
    expect(result.token).toBe('[REDACTED]');
  });

  it('should redact refresh_token field', () => {
    const data = { refresh_token: 'refresh-xyz' };
    const result = sanitize(data);
    expect(result.refresh_token).toBe('[REDACTED]');
  });

  it('should redact authorization header (case-insensitive key match)', () => {
    const data = { authorization: 'Bearer token123' };
    const result = sanitize(data);
    expect(result.authorization).toBe('[REDACTED]');
  });

  it('should redact Authorization with uppercase key', () => {
    const data = { Authorization: 'Bearer token123' };
    const result = sanitize(data);
    expect(result.Authorization).toBe('[REDACTED]');
  });

  it('should handle nested objects recursively', () => {
    const data = {
      user: { email: 'a@b.com', password: 'secret' },
      meta: { token: 'xyz' },
    };
    const result = sanitize(data);
    expect(result.user.email).toBe('a@b.com');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.meta.token).toBe('[REDACTED]');
  });

  it('should handle arrays', () => {
    const data = [{ password: 'abc' }, { name: 'test' }];
    const result = sanitize(data);
    expect(result[0].password).toBe('[REDACTED]');
    expect(result[1].name).toBe('test');
  });

  it('should return null/undefined as-is', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(true)).toBe(true);
  });

  it('should not mutate the original object', () => {
    const original = { password: 'secret', name: 'test' };
    sanitize(original);
    expect(original.password).toBe('secret');
  });
});

describe('Logger - logRequest', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log request with method, path, statusCode, ip, and responseTime', () => {
    const req = {
      method: 'GET',
      url: '/api/patients',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    };
    const res = { statusCode: 200 };
    const responseTime = 45;

    const entry = logRequest(req, res, responseTime);

    expect(entry.type).toBe('request');
    expect(entry.method).toBe('GET');
    expect(entry.path).toBe('/api/patients');
    expect(entry.statusCode).toBe(200);
    expect(entry.ip).toBe('192.168.1.1');
    expect(entry.responseTime).toBe(45);
    expect(entry.timestamp).toBeDefined();
  });

  it('should sanitize sensitive fields in the body', () => {
    const req = {
      method: 'POST',
      url: '/api/auth/login',
      headers: {},
      body: { email: 'user@mail.com', password: 'supersecret' },
    };
    const res = { statusCode: 200 };

    const entry = logRequest(req, res, 30);

    expect(entry.body.email).toBe('user@mail.com');
    expect(entry.body.password).toBe('[REDACTED]');
  });

  it('should sanitize authorization header', () => {
    const req = {
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: 'Bearer abc123', 'content-type': 'application/json' },
    };
    const res = { statusCode: 200 };

    const entry = logRequest(req, res, 20);

    expect(entry.headers.authorization).toBe('[REDACTED]');
    expect(entry.headers['content-type']).toBe('application/json');
  });

  it('should handle missing headers gracefully', () => {
    const req = { method: 'GET', url: '/test' };
    const res = { statusCode: 200 };

    const entry = logRequest(req, res, 10);

    expect(entry.ip).toBe('unknown');
    expect(entry.method).toBe('GET');
  });

  it('should use socket.remoteAddress when x-forwarded-for is missing', () => {
    const req = {
      method: 'GET',
      url: '/test',
      headers: {},
      socket: { remoteAddress: '10.0.0.1' },
    };
    const res = { statusCode: 200 };

    const entry = logRequest(req, res, 5);

    expect(entry.ip).toBe('10.0.0.1');
  });

  it('should output log as JSON to console.log', () => {
    const req = { method: 'POST', url: '/api/test', headers: {} };
    const res = { statusCode: 201 };

    logRequest(req, res, 15);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.method).toBe('POST');
    expect(logged.statusCode).toBe(201);
  });
});

describe('Logger - logError', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should log error with severity, message, stack, and timestamp', () => {
    const error = new Error('Something went wrong');
    const entry = logError(error, 'critical');

    expect(entry.type).toBe('error');
    expect(entry.severity).toBe('critical');
    expect(entry.message).toBe('Something went wrong');
    expect(entry.stack).toContain('Something went wrong');
    expect(entry.timestamp).toBeDefined();
  });

  it('should default severity to "error"', () => {
    const error = new Error('Default severity');
    const entry = logError(error);

    expect(entry.severity).toBe('error');
  });

  it('should handle string errors', () => {
    const entry = logError('A simple string error', 'warn');

    expect(entry.message).toBe('A simple string error');
    expect(entry.stack).toBeUndefined();
    expect(entry.severity).toBe('warn');
  });

  it('should output log as JSON to console.error', () => {
    const error = new Error('Test error');
    logError(error, 'error');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logged.type).toBe('error');
    expect(logged.message).toBe('Test error');
  });
});
