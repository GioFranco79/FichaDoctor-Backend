const { NotFoundError, AuthorizationError, AppError } = require('../errors');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();
  const mockIn = jest.fn();
  const mockOrder = jest.fn();
  const mockRange = jest.fn();
  const mockSingle = jest.fn();
  const mockFrom = jest.fn();

  const chainable = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    range: mockRange,
    single: mockSingle,
  };

  // Make each method return the chainable object by default
  Object.values(chainable).forEach((fn) => {
    fn.mockReturnValue(chainable);
  });

  mockFrom.mockReturnValue(chainable);

  return {
    from: mockFrom,
    _mocks: { mockFrom, ...chainable },
  };
});

const supabaseAdmin = require('../supabaseAdmin');
const patientService = require('./patientService');

describe('patientService', () => {
  const doctorId = '11111111-1111-1111-1111-111111111111';
  const patientId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chainable behavior after clearing
    const { _mocks } = supabaseAdmin;
    Object.values(_mocks).forEach((fn) => {
      if (fn.mockReturnValue) {
        fn.mockReturnValue(_mocks);
      }
    });
    _mocks.mockFrom.mockReturnValue(_mocks);
  });

  describe('create()', () => {
    const validPatientData = {
      first_name: 'Juan',
      last_name: 'Pérez',
      rut: '12.345.678-5',
      email: 'juan@test.com',
      phone: '+56912345678',
      birth_date: '1990-01-15',
      gender: 'masculino',
      address: 'Av. Siempre Viva 742',
      city: 'Santiago',
      insurance: 'Fonasa',
    };

    it('should create a patient and establish doctor-patient relationship', async () => {
      const createdPatient = { id: patientId, ...validPatientData };

      // First call: insert into patients_profile
      const insertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: createdPatient, error: null }),
        }),
      };
      // Second call: insert into doctor_patient
      const relInsertChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      let callCount = 0;
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'patients_profile') {
          return {
            insert: jest.fn().mockReturnValue(insertChain),
          };
        }
        if (table === 'doctor_patient') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await patientService.create(doctorId, validPatientData);

      expect(result).toEqual(createdPatient);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('patients_profile');
      expect(supabaseAdmin.from).toHaveBeenCalledWith('doctor_patient');
    });

    it('should reject creation with invalid RUT', async () => {
      const invalidData = { ...validPatientData, rut: '12.345.678-0' };

      await expect(patientService.create(doctorId, invalidData)).rejects.toThrow(AppError);
      await expect(patientService.create(doctorId, invalidData)).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'INVALID_RUT',
      });
    });

    it('should reject creation with malformed RUT format', async () => {
      const invalidData = { ...validPatientData, rut: '12345678-5' };

      await expect(patientService.create(doctorId, invalidData)).rejects.toThrow(AppError);
    });
  });

  describe('list()', () => {
    it('should return paginated list of patients for a doctor', async () => {
      const relations = [
        { patient_id: patientId },
        { patient_id: '33333333-3333-3333-3333-333333333333' },
      ];
      const patients = [
        { id: patientId, first_name: 'Juan', last_name: 'Pérez' },
        { id: '33333333-3333-3333-3333-333333333333', first_name: 'María', last_name: 'López' },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockImplementation((fields, opts) => {
              if (opts && opts.head) {
                return {
                  eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
                };
              }
              return {
                eq: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({ data: relations, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'patients_profile') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: patients, error: null }),
              }),
            }),
          };
        }
      });

      const result = await patientService.list(doctorId, 1, 20);

      expect(result.data).toEqual(patients);
      expect(result.pagination).toEqual({
        total: 2,
        page: 1,
        totalPages: 1,
        limit: 20,
      });
    });

    it('should return empty list when doctor has no patients', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockImplementation((fields, opts) => {
              if (opts && opts.head) {
                return {
                  eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
                };
              }
              return {
                eq: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              };
            }),
          };
        }
      });

      const result = await patientService.list(doctorId, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getById()', () => {
    it('should return patient when doctor has relationship', async () => {
      const patient = { id: patientId, first_name: 'Juan', last_name: 'Pérez', rut: '12.345.678-5' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'rel-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'patients_profile') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: patient, error: null }),
              }),
            }),
          };
        }
      });

      const result = await patientService.getById(patientId, doctorId);

      expect(result).toEqual(patient);
    });

    it('should throw AuthorizationError when no doctor-patient relationship exists', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                }),
              }),
            }),
          };
        }
      });

      await expect(patientService.getById(patientId, doctorId)).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when patient does not exist', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'rel-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'patients_profile') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          };
        }
      });

      await expect(patientService.getById(patientId, doctorId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update()', () => {
    it('should update patient when doctor has relationship and valid data', async () => {
      const updatedPatient = { id: patientId, first_name: 'Juan Carlos', last_name: 'Pérez', rut: '12.345.678-5' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'rel-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'patients_profile') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: updatedPatient, error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await patientService.update(patientId, doctorId, { first_name: 'Juan Carlos' });

      expect(result).toEqual(updatedPatient);
    });

    it('should throw AuthorizationError when no relationship exists for update', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                }),
              }),
            }),
          };
        }
      });

      await expect(
        patientService.update(patientId, doctorId, { first_name: 'Nuevo' })
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw AppError when updating with invalid RUT', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'rel-id' }, error: null }),
                }),
              }),
            }),
          };
        }
      });

      await expect(
        patientService.update(patientId, doctorId, { rut: '11.111.111-0' })
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'INVALID_RUT',
      });
    });

    it('should validate RUT successfully when valid RUT is provided in update', async () => {
      const updatedPatient = { id: patientId, first_name: 'Juan', rut: '12.345.678-5' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'doctor_patient') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 'rel-id' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'patients_profile') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: updatedPatient, error: null }),
                }),
              }),
            }),
          };
        }
      });

      const result = await patientService.update(patientId, doctorId, { rut: '12.345.678-5' });

      expect(result).toEqual(updatedPatient);
    });
  });
});
