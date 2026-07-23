const { NotFoundError, AuthorizationError, ConflictError, AppError } = require('../errors');

// Mock supabaseAdmin with chainable methods
jest.mock('../supabaseAdmin', () => {
  const mockFrom = jest.fn();
  return { from: mockFrom };
});

const supabaseAdmin = require('../supabaseAdmin');
const { create, update, cancel, list, changeStatus } = require('./appointmentService');

/**
 * Helper to create a chainable mock that supports Supabase query patterns.
 * Ends with .single() resolving to the provided value.
 */
function createChainMock(resolvedValue) {
  const terminator = jest.fn().mockResolvedValue(resolvedValue);
  const handler = {
    get: (target, prop) => {
      if (prop === 'then') return undefined; // Prevent being treated as thenable
      if (prop === 'single') return terminator;
      return jest.fn().mockReturnValue(new Proxy({}, handler));
    }
  };
  return new Proxy({}, handler);
}

/**
 * Helper for queries that end by awaiting (no .single()).
 * Resolves when the chain is awaited.
 */
function createResolvableChain(resolvedValue) {
  const handler = {
    get: (target, prop) => {
      if (prop === 'then') {
        return (resolve) => resolve(resolvedValue);
      }
      const child = new Proxy({}, handler);
      return jest.fn().mockReturnValue(child);
    }
  };
  return new Proxy({}, handler);
}

describe('appointmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validUser = { id: 'patient-1', role: 'Paciente' };
    const validData = {
      doctor_id: 'doctor-1',
      appointment_date: '2024-01-08', // Monday
      start_time: '09:00',
      notes: 'Primera consulta',
    };
    const doctorConfig = {
      work_days: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '17:00',
      slot_duration: 30,
    };

    it('should create an appointment with status pendiente', async () => {
      const expectedAppointment = {
        id: 'appt-1',
        doctor_id: 'doctor-1',
        patient_id: 'patient-1',
        created_by: 'patient-1',
        appointment_date: '2024-01-08',
        start_time: '09:00',
        end_time: '09:30',
        status: 'pendiente',
        notes: 'Primera consulta',
      };

      let apptCallCount = 0;
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'schedule_config') {
          return createChainMock({ data: doctorConfig, error: null });
        }
        if (table === 'days_off') {
          return createResolvableChain({ data: [], error: null });
        }
        if (table === 'appointments') {
          apptCallCount++;
          if (apptCallCount === 1) {
            // First call: query for existing appointments (slot availability check)
            return createResolvableChain({ data: [], error: null });
          }
          // Second call: insert
          return createChainMock({ data: expectedAppointment, error: null });
        }
        return {};
      });

      const result = await create(validUser, validData);
      expect(result).toEqual(expectedAppointment);
      expect(result.status).toBe('pendiente');
    });

    it('should reject when doctor has no schedule config', async () => {
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'schedule_config') {
          return createChainMock({ data: null, error: { message: 'not found' } });
        }
        return {};
      });

      await expect(create(validUser, validData)).rejects.toThrow(AppError);
    });

    it('should reject when slot is on a non-working day', async () => {
      const sundayData = { ...validData, appointment_date: '2024-01-07' }; // Sunday

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'schedule_config') {
          return createChainMock({ data: doctorConfig, error: null });
        }
        if (table === 'days_off') {
          return createResolvableChain({ data: [], error: null });
        }
        return {};
      });

      await expect(create(validUser, sundayData)).rejects.toThrow(AppError);
    });

    it('should reject when slot conflicts with existing appointment (409)', async () => {
      const existingAppts = [
        { id: 'other-appt', appointment_date: '2024-01-08', start_time: '09:00', end_time: '09:30' }
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'schedule_config') {
          return createChainMock({ data: doctorConfig, error: null });
        }
        if (table === 'days_off') {
          return createResolvableChain({ data: [], error: null });
        }
        if (table === 'appointments') {
          return createResolvableChain({ data: existingAppts, error: null });
        }
        return {};
      });

      await expect(create(validUser, validData)).rejects.toThrow(ConflictError);
    });

    it('should verify secretary assignment when role is Secretaria', async () => {
      const secretariaUser = { id: 'sec-1', role: 'Secretaria' };
      const dataWithPatient = { ...validData, patient_id: 'patient-1' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          // Secretary NOT assigned to doctor-1
          return createChainMock({ data: { doctor_id: 'doctor-other' }, error: null });
        }
        return {};
      });

      await expect(create(secretariaUser, dataWithPatient)).rejects.toThrow(AuthorizationError);
    });

    it('should allow secretary assigned to doctor to create appointment', async () => {
      const secretariaUser = { id: 'sec-1', role: 'Secretaria' };
      const dataWithPatient = { ...validData, patient_id: 'patient-1' };
      const expectedAppointment = {
        id: 'appt-2',
        doctor_id: 'doctor-1',
        patient_id: 'patient-1',
        created_by: 'sec-1',
        status: 'pendiente',
      };

      let apptCallCount = 0;
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          return createChainMock({ data: { doctor_id: 'doctor-1' }, error: null });
        }
        if (table === 'schedule_config') {
          return createChainMock({ data: doctorConfig, error: null });
        }
        if (table === 'days_off') {
          return createResolvableChain({ data: [], error: null });
        }
        if (table === 'appointments') {
          apptCallCount++;
          if (apptCallCount === 1) {
            return createResolvableChain({ data: [], error: null });
          }
          return createChainMock({ data: expectedAppointment, error: null });
        }
        return {};
      });

      const result = await create(secretariaUser, dataWithPatient);
      expect(result.status).toBe('pendiente');
    });
  });

  describe('update', () => {
    const existingAppointment = {
      id: 'appt-1',
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      appointment_date: '2024-01-08',
      start_time: '09:00',
      end_time: '09:30',
      status: 'pendiente',
    };
    const doctorConfig = {
      work_days: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '17:00',
      slot_duration: 30,
    };

    it('should reject modification of completed appointments', async () => {
      const completedAppt = { ...existingAppointment, status: 'completada' };
      const user = { id: 'patient-1', role: 'Paciente' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: completedAppt, error: null });
        }
        return {};
      });

      await expect(update('appt-1', user, { start_time: '10:00' })).rejects.toThrow(AppError);
    });

    it('should reject if user does not own the appointment', async () => {
      const user = { id: 'patient-other', role: 'Paciente' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: existingAppointment, error: null });
        }
        return {};
      });

      await expect(update('appt-1', user, { start_time: '10:00' })).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError for non-existent appointment', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: null, error: { message: 'not found' } });
        }
        return {};
      });

      await expect(update('nonexistent', user, { start_time: '10:00' })).rejects.toThrow(NotFoundError);
    });

    it('should update appointment when user owns it and new slot is available', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };
      const updatedAppt = { ...existingAppointment, start_time: '10:00', end_time: '10:30' };
      let apptCallCount = 0;

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'schedule_config') {
          return createChainMock({ data: doctorConfig, error: null });
        }
        if (table === 'days_off') {
          return createResolvableChain({ data: [], error: null });
        }
        if (table === 'appointments') {
          apptCallCount++;
          if (apptCallCount === 1) {
            // First call: fetch existing appointment
            return createChainMock({ data: existingAppointment, error: null });
          }
          if (apptCallCount === 2) {
            // Second call: check existing appointments for slot availability
            return createResolvableChain({ data: [], error: null });
          }
          // Third call: update
          return createChainMock({ data: updatedAppt, error: null });
        }
        return {};
      });

      const result = await update('appt-1', user, { start_time: '10:00' });
      expect(result.start_time).toBe('10:00');
    });
  });

  describe('cancel', () => {
    const existingAppointment = {
      id: 'appt-1',
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      status: 'pendiente',
    };

    it('should cancel an appointment owned by the patient', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };
      const cancelledAppt = { ...existingAppointment, status: 'cancelada' };
      let fetchDone = false;

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments' && !fetchDone) {
          fetchDone = true;
          return createChainMock({ data: existingAppointment, error: null });
        }
        if (table === 'appointments') {
          const updateSingle = jest.fn().mockResolvedValue({ data: cancelledAppt, error: null });
          const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
          const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
          const updateFn = jest.fn().mockReturnValue({ eq: updateEq });
          return { update: updateFn };
        }
        return {};
      });

      const result = await cancel('appt-1', user);
      expect(result.status).toBe('cancelada');
    });

    it('should reject cancellation if user does not own the appointment', async () => {
      const user = { id: 'patient-other', role: 'Paciente' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: existingAppointment, error: null });
        }
        return {};
      });

      await expect(cancel('appt-1', user)).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError for non-existent appointment', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: null, error: { message: 'not found' } });
        }
        return {};
      });

      await expect(cancel('nonexistent', user)).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return paginated appointments for a Doctor', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      const appointments = [
        { id: 'appt-1', doctor_id: 'doctor-1', status: 'pendiente' },
        { id: 'appt-2', doctor_id: 'doctor-1', status: 'confirmada' },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createResolvableChain({ data: appointments, error: null, count: 2 });
        }
        return {};
      });

      const result = await list(user, { page: 1, limit: 10 });
      expect(result.data).toEqual(appointments);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should return only patient own appointments for Paciente role', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };
      const appointments = [
        { id: 'appt-1', patient_id: 'patient-1', status: 'pendiente' },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createResolvableChain({ data: appointments, error: null, count: 1 });
        }
        return {};
      });

      const result = await list(user, {});
      expect(result.data).toEqual(appointments);
      expect(result.pagination.total).toBe(1);
    });

    it('should query assigned doctor appointments for Secretaria', async () => {
      const user = { id: 'sec-1', role: 'Secretaria' };
      const appointments = [
        { id: 'appt-1', doctor_id: 'doctor-1', status: 'pendiente' },
      ];

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          return createChainMock({ data: { doctor_id: 'doctor-1' }, error: null });
        }
        if (table === 'appointments') {
          return createResolvableChain({ data: appointments, error: null, count: 1 });
        }
        return {};
      });

      const result = await list(user, {});
      expect(result.data).toEqual(appointments);
    });

    it('should throw AuthorizationError if secretary has no assigned doctor', async () => {
      const user = { id: 'sec-1', role: 'Secretaria' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          return createChainMock({ data: { doctor_id: null }, error: null });
        }
        if (table === 'appointments') {
          return createResolvableChain({ data: [], error: null, count: 0 });
        }
        return {};
      });

      await expect(list(user, {})).rejects.toThrow(AuthorizationError);
    });

    it('should apply date filter', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createResolvableChain({ data: [], error: null, count: 0 });
        }
        return {};
      });

      const result = await list(user, { date: '2024-01-08' });
      expect(result.data).toEqual([]);
    });

    it('should apply status filter', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createResolvableChain({ data: [], error: null, count: 0 });
        }
        return {};
      });

      const result = await list(user, { status: 'pendiente' });
      expect(result.data).toEqual([]);
    });
  });

  describe('changeStatus', () => {
    const existingAppointment = {
      id: 'appt-1',
      doctor_id: 'doctor-1',
      patient_id: 'patient-1',
      status: 'pendiente',
    };

    it('should allow Doctor to change status of their appointment', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      const updatedAppt = { ...existingAppointment, status: 'confirmada' };
      let fetchDone = false;

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments' && !fetchDone) {
          fetchDone = true;
          return createChainMock({ data: existingAppointment, error: null });
        }
        if (table === 'appointments') {
          const updateSingle = jest.fn().mockResolvedValue({ data: updatedAppt, error: null });
          const updateSelect = jest.fn().mockReturnValue({ single: updateSingle });
          const updateEq = jest.fn().mockReturnValue({ select: updateSelect });
          const updateFn = jest.fn().mockReturnValue({ eq: updateEq });
          return { update: updateFn };
        }
        return {};
      });

      const result = await changeStatus('appt-1', user, 'confirmada');
      expect(result.status).toBe('confirmada');
    });

    it('should reject non-Doctor users from changing status', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };

      await expect(changeStatus('appt-1', user, 'confirmada')).rejects.toThrow(AuthorizationError);
    });

    it('should reject if appointment does not belong to the doctor', async () => {
      const user = { id: 'doctor-other', role: 'Doctor' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: existingAppointment, error: null });
        }
        return {};
      });

      await expect(changeStatus('appt-1', user, 'confirmada')).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError for non-existent appointment', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };

      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return createChainMock({ data: null, error: { message: 'not found' } });
        }
        return {};
      });

      await expect(changeStatus('nonexistent', user, 'confirmada')).rejects.toThrow(NotFoundError);
    });
  });
});
