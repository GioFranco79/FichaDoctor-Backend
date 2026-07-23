const { createPrescriptionSchema } = require('./prescriptionSchemas');

describe('prescriptionSchemas', () => {
  describe('createPrescriptionSchema', () => {
    const validPayload = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      medications: [
        {
          name: 'Paracetamol',
          dosage: '500mg',
          frequency: 'Cada 8 horas',
          duration: '5 días',
        },
      ],
      instructions: 'Tomar con alimentos',
    };

    it('should validate a correct payload', () => {
      const { error } = createPrescriptionSchema.validate(validPayload);
      expect(error).toBeUndefined();
    });

    it('should accept payload without instructions (optional)', () => {
      const { error } = createPrescriptionSchema.validate({
        patient_id: validPayload.patient_id,
        medications: validPayload.medications,
      });
      expect(error).toBeUndefined();
    });

    it('should accept multiple medications', () => {
      const payload = {
        ...validPayload,
        medications: [
          { name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días' },
          { name: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 12 horas', duration: '3 días' },
        ],
      };
      const { error } = createPrescriptionSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject when patient_id is missing', () => {
      const { error } = createPrescriptionSchema.validate({
        medications: validPayload.medications,
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('patient_id');
    });

    it('should reject when patient_id is not a valid UUID', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        patient_id: 'not-a-uuid',
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('patient_id');
    });

    it('should reject when medications is missing', () => {
      const { error } = createPrescriptionSchema.validate({
        patient_id: validPayload.patient_id,
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('medications');
    });

    it('should reject when medications is an empty array', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [],
      });
      expect(error).toBeDefined();
      expect(error.details[0].message).toMatch(/al menos 1 medicamento/);
    });

    it('should reject when a medication is missing name', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [{ dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días' }],
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('should reject when a medication is missing dosage', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [{ name: 'Paracetamol', frequency: 'Cada 8 horas', duration: '5 días' }],
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('dosage');
    });

    it('should reject when a medication is missing frequency', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [{ name: 'Paracetamol', dosage: '500mg', duration: '5 días' }],
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('frequency');
    });

    it('should reject when a medication is missing duration', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas' }],
      });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('duration');
    });

    it('should reject when medication name is empty string', () => {
      const { error } = createPrescriptionSchema.validate({
        ...validPayload,
        medications: [{ name: '', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días' }],
      });
      expect(error).toBeDefined();
    });
  });
});
