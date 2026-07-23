const { validateRut, calculateVerificationDigit, normalizeRut } = require('./rutValidator');

describe('rutValidator', () => {
  describe('calculateVerificationDigit', () => {
    it('should calculate correct DV for known RUTs', () => {
      // RUT 12.345.678-5
      expect(calculateVerificationDigit(12345678)).toBe('5');
      // RUT 11.111.111-1 (known valid)
      expect(calculateVerificationDigit(11111111)).toBe('1');
      // RUT 22.222.222-2 (known valid)
      expect(calculateVerificationDigit(22222222)).toBe('2');
    });

    it('should return K when remainder is 10', () => {
      // RUT 10.000.013-K (verified)
      expect(calculateVerificationDigit(10000013)).toBe('K');
    });

    it('should return 0 when remainder is 11', () => {
      // RUT 10.000.004-0 (verified)
      expect(calculateVerificationDigit(10000004)).toBe('0');
    });
  });

  describe('normalizeRut', () => {
    it('should remove dots and dashes', () => {
      expect(normalizeRut('12.345.678-5')).toBe('123456785');
    });

    it('should convert to uppercase', () => {
      expect(normalizeRut('44.444.444-k')).toBe('44444444K');
    });

    it('should return empty string for non-string input', () => {
      expect(normalizeRut(null)).toBe('');
      expect(normalizeRut(undefined)).toBe('');
      expect(normalizeRut(123)).toBe('');
    });

    it('should handle RUT without formatting', () => {
      expect(normalizeRut('123456785')).toBe('123456785');
    });
  });

  describe('validateRut', () => {
    it('should return true for valid RUTs with correct format', () => {
      expect(validateRut('12.345.678-5')).toBe(true);
      expect(validateRut('11.111.111-1')).toBe(true);
      expect(validateRut('22.222.222-2')).toBe(true);
    });

    it('should return true for valid RUT with K as DV', () => {
      expect(validateRut('10.000.013-K')).toBe(true);
    });

    it('should accept lowercase k as DV', () => {
      expect(validateRut('10.000.013-k')).toBe(true);
    });

    it('should return false for invalid DV', () => {
      expect(validateRut('12.345.678-0')).toBe(false);
      expect(validateRut('12.345.678-K')).toBe(false);
    });

    it('should return false for incorrect format (no dots)', () => {
      expect(validateRut('12345678-5')).toBe(false);
    });

    it('should return false for incorrect format (no dash)', () => {
      expect(validateRut('12.345.6785')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(validateRut(null)).toBe(false);
      expect(validateRut(undefined)).toBe(false);
      expect(validateRut(12345678)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(validateRut('')).toBe(false);
    });

    it('should return false for arbitrary strings', () => {
      expect(validateRut('hello world')).toBe(false);
      expect(validateRut('abc.def.ghi-j')).toBe(false);
    });

    it('should accept RUT with 1-2 digits before first dot', () => {
      // Single digit before first dot (e.g., 1.234.567-4)
      const dv = calculateVerificationDigit(1234567);
      expect(validateRut(`1.234.567-${dv}`)).toBe(true);
    });
  });
});
