const auditService = require('./auditService');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const mockSelect = jest.fn();
  const mockSingle = jest.fn();
  const mockInsert = jest.fn();
  const mockFrom = jest.fn();

  mockSingle.mockResolvedValue({ data: { id: 'test-uuid' }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });

  return {
    from: mockFrom,
    __mocks: { mockFrom, mockInsert, mockSelect, mockSingle },
  };
});

const supabaseAdmin = require('../supabaseAdmin');

describe('auditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock chain
    supabaseAdmin.__mocks.mockSingle.mockResolvedValue({ data: { id: 'test-uuid' }, error: null });
    supabaseAdmin.__mocks.mockSelect.mockReturnValue({ single: supabaseAdmin.__mocks.mockSingle });
    supabaseAdmin.__mocks.mockInsert.mockReturnValue({ select: supabaseAdmin.__mocks.mockSelect });
    supabaseAdmin.__mocks.mockFrom.mockReturnValue({ insert: supabaseAdmin.__mocks.mockInsert });
  });

  describe('log()', () => {
    it('should insert a record into audit_log table with all fields', async () => {
      const userId = 'user-123';
      const action = 'READ';
      const resourceType = 'medical_record';
      const resourceId = 'record-456';
      const ipAddress = '192.168.1.1';
      const details = { reason: 'consultation' };

      await auditService.log(userId, action, resourceType, resourceId, ipAddress, details);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_log');
      expect(supabaseAdmin.__mocks.mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: ipAddress,
        details,
      });
    });

    it('should handle null resourceId and ipAddress', async () => {
      await auditService.log('user-123', 'CREATE', 'prescription', null, null);

      expect(supabaseAdmin.__mocks.mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'CREATE',
        resource_type: 'prescription',
        resource_id: null,
        ip_address: null,
        details: null,
      });
    });

    it('should default details to null when not provided', async () => {
      await auditService.log('user-123', 'UPDATE', 'medical_record', 'rec-1', '10.0.0.1');

      expect(supabaseAdmin.__mocks.mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'UPDATE',
        resource_type: 'medical_record',
        resource_id: 'rec-1',
        ip_address: '10.0.0.1',
        details: null,
      });
    });

    it('should return the created audit record on success', async () => {
      const mockData = { id: 'audit-789', user_id: 'user-123', action: 'READ' };
      supabaseAdmin.__mocks.mockSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await auditService.log('user-123', 'READ', 'medical_record', 'rec-1', '10.0.0.1');

      expect(result).toEqual(mockData);
    });

    it('should return null and log error when insert fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabaseAdmin.__mocks.mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const result = await auditService.log('user-123', 'DELETE', 'medical_record', 'rec-1', '10.0.0.1');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AuditService] Error registrando auditoría:',
        'DB error'
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('logClinicalAccess()', () => {
    it('should call log() with clinical_access details', async () => {
      const userId = 'doctor-001';
      const action = 'READ';
      const resourceType = 'medical_record';
      const resourceId = 'record-123';
      const ipAddress = '192.168.0.5';

      await auditService.logClinicalAccess(userId, action, resourceType, resourceId, ipAddress);

      expect(supabaseAdmin.__mocks.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          ip_address: ipAddress,
          details: expect.objectContaining({
            clinical_access: true,
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should include a valid ISO timestamp in details', async () => {
      await auditService.logClinicalAccess('user-1', 'READ', 'prescription', 'rx-1', '127.0.0.1');

      const insertCall = supabaseAdmin.__mocks.mockInsert.mock.calls[0][0];
      const timestamp = insertCall.details.timestamp;

      // Validate ISO format
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should register unauthorized access attempts (action DELETE with clinical data)', async () => {
      await auditService.logClinicalAccess('intruder-1', 'DELETE', 'medical_record', 'rec-99', '10.10.10.10');

      expect(supabaseAdmin.__mocks.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'intruder-1',
          action: 'DELETE',
          resource_type: 'medical_record',
          resource_id: 'rec-99',
          ip_address: '10.10.10.10',
        })
      );
    });
  });
});
