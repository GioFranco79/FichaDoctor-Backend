const prescriptionService = require('./prescriptionService');
const { NotFoundError, AuthorizationError } = require('../errors');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const mockSingle = jest.fn();
  const mockOrder = jest.fn();
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockEq = jest.fn();
  const mockFrom = jest.fn();

  return {
    from: mockFrom,
    __mocks: { mockFrom, mockInsert, mockSelect, mockSingle, mockOrder, mockEq },
  };
});

// Mock auditService
jest.mock('./auditService', () => ({
  logClinicalAccess: jest.fn().mockResolvedValue(null),
}));

// Mock pdfService
jest.mock('./pdfService', () => ({
  generatePrescriptionPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
}));

const supabaseAdmin = require('../supabaseAdmin');
const auditService = require('./auditService');
const pdfService = require('./pdfService');

function setupInsertMock(data, error = null) {
  const mockSingle = jest.fn().mockResolvedValue({ data, error });
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
  supabaseAdmin.from.mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockSelect, mockSingle };
}

function setupSelectMock(data, error = null, options = {}) {
  const mockSingle = jest.fn().mockResolvedValue({ data, error });
  const mockOrder = jest.fn().mockResolvedValue({ data, error });
  const mockEq = jest.fn();

  if (options.useSingle) {
    mockEq.mockReturnValue({ single: mockSingle });
  } else if (options.useOrder) {
    mockEq.mockReturnValue({ order: mockOrder });
  } else {
    mockEq.mockReturnValue(mockEq);
  }

  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  supabaseAdmin.from.mockReturnValue({ select: mockSelect });
  return { mockSelect, mockEq, mockSingle, mockOrder };
}

describe('prescriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a prescription linked to doctor and patient', async () => {
      const doctorId = 'doctor-uuid-1';
      const data = {
        patient_id: 'patient-uuid-1',
        medications: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 8 horas', duration: '5 días' }],
        instructions: 'Tomar con comida',
      };

      const mockPrescription = {
        id: 'prescription-uuid-1',
        doctor_id: doctorId,
        patient_id: data.patient_id,
        medications: data.medications,
        instructions: data.instructions,
        issue_date: '2024-01-15',
        created_at: '2024-01-15T10:00:00.000Z',
      };

      setupInsertMock(mockPrescription);

      const result = await prescriptionService.create(doctorId, data, '192.168.1.1');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('prescriptions');
      expect(result).toEqual(mockPrescription);
      expect(auditService.logClinicalAccess).toHaveBeenCalledWith(
        doctorId,
        'CREATE',
        'prescription',
        'prescription-uuid-1',
        '192.168.1.1'
      );
    });

    it('should set issue_date to current date', async () => {
      const mockPrescription = { id: 'rx-1', doctor_id: 'd1', patient_id: 'p1', medications: [], instructions: null, issue_date: '2024-01-15', created_at: '2024-01-15T10:00:00.000Z' };
      const { mockInsert } = setupInsertMock(mockPrescription);

      await prescriptionService.create('d1', { patient_id: 'p1', medications: [] }, null);

      const insertedData = mockInsert.mock.calls[0][0];
      // issue_date should be a date string in YYYY-MM-DD format
      expect(insertedData.issue_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should throw when insert fails', async () => {
      setupInsertMock(null, { message: 'DB error', code: '23505' });

      await expect(
        prescriptionService.create('d1', { patient_id: 'p1', medications: [] }, null)
      ).rejects.toEqual(expect.objectContaining({ message: 'DB error' }));
    });
  });

  describe('getByPatient()', () => {
    it('should return prescriptions ordered by created_at desc', async () => {
      const prescriptions = [
        { id: 'rx-2', created_at: '2024-02-01' },
        { id: 'rx-1', created_at: '2024-01-01' },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: prescriptions, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabaseAdmin.from.mockReturnValue({ select: mockSelect });

      const result = await prescriptionService.getByPatient('patient-uuid-1');

      expect(supabaseAdmin.from).toHaveBeenCalledWith('prescriptions');
      expect(mockEq).toHaveBeenCalledWith('patient_id', 'patient-uuid-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(prescriptions);
    });

    it('should return empty array when no prescriptions exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      supabaseAdmin.from.mockReturnValue({ select: mockSelect });

      const result = await prescriptionService.getByPatient('patient-uuid-1');

      expect(result).toEqual([]);
    });
  });

  describe('generatePdf()', () => {
    function setupGeneratePdfMocks(prescription, doctor, patient) {
      let userCallCount = 0;

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'prescriptions') {
          const mockSingle = jest.fn().mockResolvedValue({ data: prescription, error: prescription ? null : { message: 'not found' } });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        if (table === 'users') {
          userCallCount++;
          const currentUser = userCallCount === 1 ? doctor : patient;
          const mockSingle = jest.fn().mockResolvedValue({
            data: currentUser,
            error: currentUser ? null : { message: 'not found' },
          });
          const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
          return { select: mockSelect };
        }
        return { select: jest.fn().mockReturnValue({ eq: jest.fn() }) };
      });
    }

    const mockPrescription = {
      id: 'rx-1',
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      medications: [{ name: 'Aspirina', dosage: '100mg', frequency: 'Diaria', duration: '30 días' }],
      instructions: 'Tomar en ayunas',
      issue_date: '2024-01-15',
      created_at: '2024-01-15T10:00:00Z',
    };

    const mockDoctor = { first_name: 'Juan', last_name: 'Pérez' };
    const mockPatient = { first_name: 'María', last_name: 'García' };

    it('should generate PDF for the prescription doctor', async () => {
      setupGeneratePdfMocks(mockPrescription, mockDoctor, mockPatient);

      const user = { id: 'doctor-1', role: 'Doctor' };
      const result = await prescriptionService.generatePdf('rx-1', user);

      expect(result).toBeInstanceOf(Buffer);
      expect(pdfService.generatePrescriptionPdf).toHaveBeenCalledWith({
        id: 'rx-1',
        doctor: mockDoctor,
        patient: mockPatient,
        medications: mockPrescription.medications,
        instructions: mockPrescription.instructions,
        issue_date: mockPrescription.issue_date,
      });
    });

    it('should generate PDF for the prescription patient', async () => {
      setupGeneratePdfMocks(mockPrescription, mockDoctor, mockPatient);

      const user = { id: 'patient-1', role: 'Paciente' };
      const result = await prescriptionService.generatePdf('rx-1', user);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw AuthorizationError when Doctor is not the prescription doctor', async () => {
      setupGeneratePdfMocks(mockPrescription, mockDoctor, mockPatient);

      const user = { id: 'other-doctor', role: 'Doctor' };

      await expect(prescriptionService.generatePdf('rx-1', user)).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError when Paciente is not the prescription patient', async () => {
      setupGeneratePdfMocks(mockPrescription, mockDoctor, mockPatient);

      const user = { id: 'other-patient', role: 'Paciente' };

      await expect(prescriptionService.generatePdf('rx-1', user)).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when prescription does not exist', async () => {
      setupGeneratePdfMocks(null, null, null);

      const user = { id: 'doctor-1', role: 'Doctor' };

      await expect(prescriptionService.generatePdf('nonexistent', user)).rejects.toThrow(NotFoundError);
    });
  });
});
