const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSecretarySchema,
} = require('./authSchemas');

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Juan',
      last_name: 'Pérez',
      rut: '12.345.678-5',
      role: 'Doctor',
    };

    it('should validate correct registration data', () => {
      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const { error } = registerSchema.validate({ ...validData, email: undefined });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('should reject invalid email format', () => {
      const { error } = registerSchema.validate({ ...validData, email: 'not-an-email' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('should reject password shorter than 8 characters', () => {
      const { error } = registerSchema.validate({ ...validData, password: '1234567' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('password');
    });

    it('should reject first_name shorter than 2 characters', () => {
      const { error } = registerSchema.validate({ ...validData, first_name: 'A' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('first_name');
    });

    it('should reject last_name shorter than 2 characters', () => {
      const { error } = registerSchema.validate({ ...validData, last_name: 'B' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('last_name');
    });

    it('should reject invalid RUT format', () => {
      const { error } = registerSchema.validate({ ...validData, rut: '12345678-5' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('rut');
    });

    it('should reject RUT without dots', () => {
      const { error } = registerSchema.validate({ ...validData, rut: '12345678-5' });
      expect(error).toBeDefined();
    });

    it('should accept valid roles: Doctor, Paciente, Secretaria', () => {
      for (const role of ['Doctor', 'Paciente', 'Secretaria']) {
        const { error } = registerSchema.validate({ ...validData, role });
        expect(error).toBeUndefined();
      }
    });

    it('should reject Admin role', () => {
      const { error } = registerSchema.validate({ ...validData, role: 'Admin' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('role');
    });

    it('should reject invalid role values', () => {
      const { error } = registerSchema.validate({ ...validData, role: 'SuperUser' });
      expect(error).toBeDefined();
    });

    it('should reject missing required fields', () => {
      const { error } = registerSchema.validate({}, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('loginSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should validate correct login data', () => {
      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const { error } = loginSchema.validate({ password: 'password123' });
      expect(error).toBeDefined();
    });

    it('should reject invalid email', () => {
      const { error } = loginSchema.validate({ ...validData, email: 'invalid' });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = loginSchema.validate({ email: 'test@example.com' });
      expect(error).toBeDefined();
    });

    it('should accept any non-empty password (no min length for login)', () => {
      const { error } = loginSchema.validate({ ...validData, password: 'a' });
      expect(error).toBeUndefined();
    });
  });

  describe('refreshSchema', () => {
    it('should validate correct refresh token data', () => {
      const { error } = refreshSchema.validate({ refresh_token: 'some-refresh-token' });
      expect(error).toBeUndefined();
    });

    it('should reject missing refresh_token', () => {
      const { error } = refreshSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should reject empty refresh_token', () => {
      const { error } = refreshSchema.validate({ refresh_token: '' });
      expect(error).toBeDefined();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'test@example.com' });
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const { error } = forgotPasswordSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const { error } = forgotPasswordSchema.validate({ email: 'not-valid' });
      expect(error).toBeDefined();
    });
  });

  describe('resetPasswordSchema', () => {
    const validData = {
      token: 'recovery-token-abc123',
      password: 'newpassword1',
    };

    it('should validate correct reset password data', () => {
      const { error } = resetPasswordSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing token', () => {
      const { error } = resetPasswordSchema.validate({ password: 'newpassword1' });
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const { error } = resetPasswordSchema.validate({ token: 'some-token' });
      expect(error).toBeDefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const { error } = resetPasswordSchema.validate({ ...validData, password: '1234567' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('password');
    });
  });

  describe('registerSecretarySchema', () => {
    const validData = {
      email: 'secretary@example.com',
      password: 'password123',
      first_name: 'María',
      last_name: 'González',
      rut: '9.876.543-2',
    };

    it('should validate correct secretary registration data', () => {
      const { error } = registerSecretarySchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, email: undefined });
      expect(error).toBeDefined();
    });

    it('should reject invalid email', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, email: 'bad' });
      expect(error).toBeDefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, password: 'short' });
      expect(error).toBeDefined();
    });

    it('should reject missing first_name', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, first_name: undefined });
      expect(error).toBeDefined();
    });

    it('should reject missing last_name', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, last_name: undefined });
      expect(error).toBeDefined();
    });

    it('should reject invalid RUT format', () => {
      const { error } = registerSecretarySchema.validate({ ...validData, rut: '9876543-2' });
      expect(error).toBeDefined();
    });

    it('should not include a role field (role is set automatically)', () => {
      const dataWithRole = { ...validData, role: 'Secretaria' };
      const { value } = registerSecretarySchema.validate(dataWithRole, { stripUnknown: true });
      expect(value.role).toBeUndefined();
    });
  });
});
