const {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
} = require('./medicalRecordSchemas');

describe('medicalRecordSchemas', () => {
  describe('createMedicalRecordSchema', () => {
    it('should validate a complete valid payload', () => {
      const payload = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: 'Gripe estacional',
        clinical_notes: 'Paciente presenta fiebre',
        background: 'Diabetes tipo 2',
      };
      const { error, value } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value).toEqual(payload);
    });

    it('should validate with only required fields', () => {
      const payload = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: 'Hipertensión',
      };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject when patient_id is missing', () => {
      const payload = { diagnosis: 'Gripe' };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('patient_id');
    });

    it('should reject when patient_id is not a valid UUID', () => {
      const payload = { patient_id: 'not-a-uuid', diagnosis: 'Gripe' };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('patient_id');
    });

    it('should reject when diagnosis is missing', () => {
      const payload = { patient_id: '550e8400-e29b-41d4-a716-446655440000' };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('diagnosis');
    });

    it('should reject when diagnosis is an empty string', () => {
      const payload = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: '',
      };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('diagnosis');
    });

    it('should allow clinical_notes as empty string', () => {
      const payload = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: 'Gripe',
        clinical_notes: '',
      };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should allow background as empty string', () => {
      const payload = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        diagnosis: 'Gripe',
        background: '',
      };
      const { error } = createMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });
  });

  describe('updateMedicalRecordSchema', () => {
    it('should validate with only diagnosis', () => {
      const payload = { diagnosis: 'Diagnóstico actualizado' };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with only clinical_notes', () => {
      const payload = { clinical_notes: 'Nuevas notas' };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with only background', () => {
      const payload = { background: 'Antecedentes actualizados' };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with all fields', () => {
      const payload = {
        diagnosis: 'Nuevo diagnóstico',
        clinical_notes: 'Nuevas notas',
        background: 'Nuevos antecedentes',
      };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject an empty object (no fields provided)', () => {
      const payload = {};
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('al menos un campo');
    });

    it('should reject when diagnosis is empty string', () => {
      const payload = { diagnosis: '' };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('should allow clinical_notes and background as empty strings', () => {
      const payload = { clinical_notes: '', background: '' };
      const { error } = updateMedicalRecordSchema.validate(payload);
      expect(error).toBeUndefined();
    });
  });
});
