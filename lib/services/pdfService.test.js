const { generatePrescriptionPdf } = require('./pdfService');

describe('pdfService', () => {
  describe('generatePrescriptionPdf', () => {
    const basePrescription = {
      doctor: { first_name: 'Carlos', last_name: 'Muñoz' },
      patient: { first_name: 'María', last_name: 'González', rut: '12.345.678-5' },
      medications: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días' },
        { name: 'Ibuprofeno', dosage: '400mg', frequency: 'Cada 12 horas', duration: '3 días' },
      ],
      instructions: 'Tomar con alimentos. Reposo por 3 días.',
      issue_date: '2024-01-15',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should return a Buffer', async () => {
      const result = await generatePrescriptionPdf(basePrescription);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should return a non-empty Buffer', async () => {
      const result = await generatePrescriptionPdf(basePrescription);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce a valid PDF (starts with %PDF header)', async () => {
      const result = await generatePrescriptionPdf(basePrescription);
      const header = result.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should handle a prescription with a single medication', async () => {
      const prescription = {
        ...basePrescription,
        medications: [
          { name: 'Amoxicilina', dosage: '250mg', frequency: 'Cada 8 horas', duration: '7 días' },
        ],
      };
      const result = await generatePrescriptionPdf(prescription);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle a prescription with no instructions', async () => {
      const prescription = {
        ...basePrescription,
        instructions: '',
      };
      const result = await generatePrescriptionPdf(prescription);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle a prescription with null instructions', async () => {
      const prescription = {
        ...basePrescription,
        instructions: null,
      };
      const result = await generatePrescriptionPdf(prescription);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty medications array', async () => {
      const prescription = {
        ...basePrescription,
        medications: [],
      };
      const result = await generatePrescriptionPdf(prescription);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use current timestamp when created_at is not provided', async () => {
      const prescription = {
        ...basePrescription,
        created_at: undefined,
      };
      const result = await generatePrescriptionPdf(prescription);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
