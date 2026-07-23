const { NotFoundError, AuthorizationError } = require('../errors');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    __mockFrom: mockFrom,
    __mockSelect: mockSelect,
    __mockInsert: mockInsert,
    __mockUpdate: mockUpdate,
  };
});

const supabaseAdmin = require('../supabaseAdmin');
const {
  createConfig,
  updateConfig,
  addDayOff,
  getAvailability,
  verifyDoctorAccess,
} = require('./scheduleService');

describe('scheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyDoctorAccess', () => {
    it('should allow a Doctor to access their own schedule', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      await expect(verifyDoctorAccess(user, 'doctor-1')).resolves.toBeUndefined();
    });

    it('should reject a Doctor accessing another doctor schedule', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      await expect(verifyDoctorAccess(user, 'doctor-2')).rejects.toThrow(AuthorizationError);
    });

    it('should allow a Secretaria assigned to the doctor', async () => {
      const user = { id: 'secretary-1', role: 'Secretaria' };
      
      // Mock chain: from('users').select('doctor_id').eq('id', user.id).single()
      const mockSingle = jest.fn().mockResolvedValue({ data: { doctor_id: 'doctor-1' }, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectChain = jest.fn().mockReturnValue({ eq: mockEq });
      supabaseAdmin.from.mockReturnValue({ select: mockSelectChain });

      await expect(verifyDoctorAccess(user, 'doctor-1')).resolves.toBeUndefined();
    });

    it('should reject a Secretaria not assigned to the doctor', async () => {
      const user = { id: 'secretary-1', role: 'Secretaria' };
      
      const mockSingle = jest.fn().mockResolvedValue({ data: { doctor_id: 'doctor-other' }, error: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectChain = jest.fn().mockReturnValue({ eq: mockEq });
      supabaseAdmin.from.mockReturnValue({ select: mockSelectChain });

      await expect(verifyDoctorAccess(user, 'doctor-1')).rejects.toThrow(AuthorizationError);
    });

    it('should reject users with unauthorized roles', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };
      await expect(verifyDoctorAccess(user, 'doctor-1')).rejects.toThrow(AuthorizationError);
    });
  });

  describe('createConfig', () => {
    it('should create a schedule config for the doctor', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      const configData = {
        workDays: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '17:00',
        slotDuration: 30,
      };

      const expectedResult = {
        id: 'config-1',
        doctor_id: 'doctor-1',
        work_days: [1, 2, 3, 4, 5],
        start_time: '08:00',
        end_time: '17:00',
        slot_duration: 30,
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: expectedResult, error: null });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsertChain = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      supabaseAdmin.from.mockReturnValue({ insert: mockInsertChain });

      const result = await createConfig('doctor-1', configData, user);
      expect(result).toEqual(expectedResult);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('schedule_config');
    });

    it('should reject if user is not authorized', async () => {
      const user = { id: 'doctor-2', role: 'Doctor' };
      const configData = { workDays: [1], startTime: '08:00', endTime: '17:00', slotDuration: 30 };

      await expect(createConfig('doctor-1', configData, user)).rejects.toThrow(AuthorizationError);
    });
  });

  describe('updateConfig', () => {
    it('should update a schedule config', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      const configData = { slotDuration: 20 };

      // First call: fetch existing config
      const mockFetchSingle = jest.fn().mockResolvedValue({ data: { doctor_id: 'doctor-1' }, error: null });
      const mockFetchEq = jest.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchSelect = jest.fn().mockReturnValue({ eq: mockFetchEq });

      // Second call: update config
      const mockUpdateSingle = jest.fn().mockResolvedValue({ 
        data: { id: 'config-1', slot_duration: 20 }, 
        error: null 
      });
      const mockUpdateSelectChain = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockUpdateEq = jest.fn().mockReturnValue({ select: mockUpdateSelectChain });
      const mockUpdateChain = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockFetchSelect })
        .mockReturnValueOnce({ update: mockUpdateChain });

      const result = await updateConfig('config-1', configData, user);
      expect(result).toEqual({ id: 'config-1', slot_duration: 20 });
    });

    it('should throw NotFoundError if config does not exist', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };

      const mockFetchSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
      const mockFetchEq = jest.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchSelect = jest.fn().mockReturnValue({ eq: mockFetchEq });
      supabaseAdmin.from.mockReturnValue({ select: mockFetchSelect });

      await expect(updateConfig('nonexistent', {}, user)).rejects.toThrow(NotFoundError);
    });
  });

  describe('addDayOff', () => {
    it('should add a day off for the doctor', async () => {
      const user = { id: 'doctor-1', role: 'Doctor' };
      const expectedResult = {
        id: 'dayoff-1',
        doctor_id: 'doctor-1',
        date: '2024-12-25',
        reason: 'Navidad',
      };

      const mockSingle = jest.fn().mockResolvedValue({ data: expectedResult, error: null });
      const mockSelectAfterInsert = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsertChain = jest.fn().mockReturnValue({ select: mockSelectAfterInsert });
      supabaseAdmin.from.mockReturnValue({ insert: mockInsertChain });

      const result = await addDayOff('doctor-1', '2024-12-25', 'Navidad', user);
      expect(result).toEqual(expectedResult);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('days_off');
    });

    it('should reject if user is not authorized', async () => {
      const user = { id: 'patient-1', role: 'Paciente' };
      await expect(addDayOff('doctor-1', '2024-12-25', 'Navidad', user)).rejects.toThrow(AuthorizationError);
    });
  });

  describe('getAvailability', () => {
    it('should return available slots for a doctor', async () => {
      const config = {
        work_days: [1, 2, 3, 4, 5],
        start_time: '09:00',
        end_time: '10:00',
        slot_duration: 30,
      };

      // Mock for schedule_config query
      const mockConfigSingle = jest.fn().mockResolvedValue({ data: config, error: null });
      const mockConfigEq = jest.fn().mockReturnValue({ single: mockConfigSingle });
      const mockConfigSelect = jest.fn().mockReturnValue({ eq: mockConfigEq });

      // Mock for days_off query
      const mockDaysOffLte = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockDaysOffGte = jest.fn().mockReturnValue({ lte: mockDaysOffLte });
      const mockDaysOffEq = jest.fn().mockReturnValue({ gte: mockDaysOffGte });
      const mockDaysOffSelect = jest.fn().mockReturnValue({ eq: mockDaysOffEq });

      // Mock for appointments query
      const mockApptNeq = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockApptLte = jest.fn().mockReturnValue({ neq: mockApptNeq });
      const mockApptGte = jest.fn().mockReturnValue({ lte: mockApptLte });
      const mockApptEq = jest.fn().mockReturnValue({ gte: mockApptGte });
      const mockApptSelect = jest.fn().mockReturnValue({ eq: mockApptEq });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockConfigSelect })
        .mockReturnValueOnce({ select: mockDaysOffSelect })
        .mockReturnValueOnce({ select: mockApptSelect });

      // Monday 2024-01-08
      const result = await getAvailability('doctor-1', '2024-01-08', '2024-01-08');
      
      expect(result).toHaveLength(2); // 09:00-09:30 and 09:30-10:00
      expect(result[0]).toEqual({ date: '2024-01-08', startTime: '09:00', endTime: '09:30' });
      expect(result[1]).toEqual({ date: '2024-01-08', startTime: '09:30', endTime: '10:00' });
    });

    it('should throw NotFoundError if no schedule config exists', async () => {
      const mockConfigSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
      const mockConfigEq = jest.fn().mockReturnValue({ single: mockConfigSingle });
      const mockConfigSelect = jest.fn().mockReturnValue({ eq: mockConfigEq });
      supabaseAdmin.from.mockReturnValue({ select: mockConfigSelect });

      await expect(getAvailability('doctor-1', '2024-01-08', '2024-01-08')).rejects.toThrow(NotFoundError);
    });

    it('should exclude days off from availability', async () => {
      const config = {
        work_days: [1, 2, 3, 4, 5],
        start_time: '09:00',
        end_time: '10:00',
        slot_duration: 30,
      };

      const mockConfigSingle = jest.fn().mockResolvedValue({ data: config, error: null });
      const mockConfigEq = jest.fn().mockReturnValue({ single: mockConfigSingle });
      const mockConfigSelect = jest.fn().mockReturnValue({ eq: mockConfigEq });

      // Day off on the queried date
      const mockDaysOffLte = jest.fn().mockResolvedValue({ data: [{ date: '2024-01-08' }], error: null });
      const mockDaysOffGte = jest.fn().mockReturnValue({ lte: mockDaysOffLte });
      const mockDaysOffEq = jest.fn().mockReturnValue({ gte: mockDaysOffGte });
      const mockDaysOffSelect = jest.fn().mockReturnValue({ eq: mockDaysOffEq });

      const mockApptNeq = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockApptLte = jest.fn().mockReturnValue({ neq: mockApptNeq });
      const mockApptGte = jest.fn().mockReturnValue({ lte: mockApptLte });
      const mockApptEq = jest.fn().mockReturnValue({ gte: mockApptGte });
      const mockApptSelect = jest.fn().mockReturnValue({ eq: mockApptEq });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockConfigSelect })
        .mockReturnValueOnce({ select: mockDaysOffSelect })
        .mockReturnValueOnce({ select: mockApptSelect });

      const result = await getAvailability('doctor-1', '2024-01-08', '2024-01-08');
      expect(result).toHaveLength(0);
    });

    it('should exclude slots occupied by existing appointments', async () => {
      const config = {
        work_days: [1, 2, 3, 4, 5],
        start_time: '09:00',
        end_time: '10:00',
        slot_duration: 30,
      };

      const mockConfigSingle = jest.fn().mockResolvedValue({ data: config, error: null });
      const mockConfigEq = jest.fn().mockReturnValue({ single: mockConfigSingle });
      const mockConfigSelect = jest.fn().mockReturnValue({ eq: mockConfigEq });

      const mockDaysOffLte = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockDaysOffGte = jest.fn().mockReturnValue({ lte: mockDaysOffLte });
      const mockDaysOffEq = jest.fn().mockReturnValue({ gte: mockDaysOffGte });
      const mockDaysOffSelect = jest.fn().mockReturnValue({ eq: mockDaysOffEq });

      // One appointment occupies 09:00-09:30
      const existingAppts = [{ appointment_date: '2024-01-08', start_time: '09:00', end_time: '09:30' }];
      const mockApptNeq = jest.fn().mockResolvedValue({ data: existingAppts, error: null });
      const mockApptLte = jest.fn().mockReturnValue({ neq: mockApptNeq });
      const mockApptGte = jest.fn().mockReturnValue({ lte: mockApptLte });
      const mockApptEq = jest.fn().mockReturnValue({ gte: mockApptGte });
      const mockApptSelect = jest.fn().mockReturnValue({ eq: mockApptEq });

      supabaseAdmin.from
        .mockReturnValueOnce({ select: mockConfigSelect })
        .mockReturnValueOnce({ select: mockDaysOffSelect })
        .mockReturnValueOnce({ select: mockApptSelect });

      const result = await getAvailability('doctor-1', '2024-01-08', '2024-01-08');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ date: '2024-01-08', startTime: '09:30', endTime: '10:00' });
    });
  });
});
