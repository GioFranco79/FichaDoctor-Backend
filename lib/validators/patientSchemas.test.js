const { createPatientSchema, updatePatientSchema } = require('./patientSchemas');

describe('patientSchemas', () => {
  describe('createPatientSchema', () => {
    const validPatient = {
      first_name: 'Juan',
      last_name: 'Pérez',
      rut: '12.345.678-5'
    };

    it('should accept valid patient with required fields only', () => {
      const { error } = createPatientSchema.validate(validPatient);
      expect(error).toBeUndefined();
    });

    it('should accept valid patient with all fields', () => {
      const fullPatient = {
        ...validPatient,
        email: 'juan@example.com',
        phone: '+56912345678',
        birth_date: '1990-05-15',
        gender: 'masculino',
        address: 'Av. Siempre Viva 123',
        city: 'Santiago',
        insurance: 'Fonasa'
      };
      const { error } = createPatientSchema.validate(fullPatient);
      expect(error).toBeUndefined();
    });

    it('should reject when first_name is missing', () => {
      const { error } = createPatientSchema.validate({
        last_name: 'Pérez',
        rut: '12.345.678-5'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('first_name');
    });

    it('should reject when last_name is missing', () => {
      const { error } = createPatientSchema.validate({
        first_name: 'Juan',
        rut: '12.345.678-5'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('last_name');
    });

    it('should reject when rut is missing', () => {
      const { error } = createPatientSchema.validate({
        first_name: 'Juan',
        last_name: 'Pérez'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('rut');
    });

    it('should reject first_name shorter than 2 characters', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        first_name: 'J'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('first_name');
    });

    it('should reject last_name shorter than 2 characters', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        last_name: 'P'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('last_name');
    });

    it('should reject invalid RUT', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        rut: '12.345.678-0'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('rut');
    });

    it('should reject RUT with wrong format', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        rut: '12345678-5'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('rut');
    });

    it('should reject invalid email', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        email: 'not-an-email'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('should reject invalid birth_date format', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        birth_date: '15/05/1990'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('birth_date');
    });

    it('should reject invalid gender value', () => {
      const { error } = createPatientSchema.validate({
        ...validPatient,
        gender: 'invalid'
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('gender');
    });

    it('should accept all valid gender values', () => {
      for (const gender of ['masculino', 'femenino', 'otro']) {
        const { error } = createPatientSchema.validate({
          ...validPatient,
          gender
        });
        expect(error).toBeUndefined();
      }
    });
  });

  describe('updatePatientSchema', () => {
    it('should accept update with single field', () => {
      const { error } = updatePatientSchema.validate({ first_name: 'Carlos' });
      expect(error).toBeUndefined();
    });

    it('should accept update with multiple fields', () => {
      const { error } = updatePatientSchema.validate({
        first_name: 'Carlos',
        email: 'carlos@example.com',
        city: 'Valparaíso'
      });
      expect(error).toBeUndefined();
    });

    it('should reject empty object (at least one field required)', () => {
      const { error } = updatePatientSchema.validate({});
      expect(error).toBeDefined();
    });

    it('should reject first_name shorter than 2 characters', () => {
      const { error } = updatePatientSchema.validate({ first_name: 'C' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('first_name');
    });

    it('should reject invalid RUT on update', () => {
      const { error } = updatePatientSchema.validate({ rut: '12.345.678-0' });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('rut');
    });

    it('should accept valid RUT on update', () => {
      const { error } = updatePatientSchema.validate({ rut: '12.345.678-5' });
      expect(error).toBeUndefined();
    });

    it('should reject invalid gender on update', () => {
      const { error } = updatePatientSchema.validate({ gender: 'other' });
      expect(error).toBeDefined();
    });

    it('should reject invalid email on update', () => {
      const { error } = updatePatientSchema.validate({ email: 'bad-email' });
      expect(error).toBeDefined();
    });

    it('should accept valid insurance field', () => {
      const { error } = updatePatientSchema.validate({ insurance: 'Isapre Cruz Blanca' });
      expect(error).toBeUndefined();
    });
  });
});
