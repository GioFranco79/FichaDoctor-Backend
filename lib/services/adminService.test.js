const { NotFoundError } = require('../errors');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const mockSelect = jest.fn();
  const mockOrder = jest.fn();
  const mockRange = jest.fn();
  const mockEq = jest.fn();
  const mockSingle = jest.fn();
  const mockUpdate = jest.fn();

  const chainable = {
    select: mockSelect,
    order: mockOrder,
    range: mockRange,
    eq: mockEq,
    single: mockSingle,
    update: mockUpdate,
    from: jest.fn(),
  };

  // Make each method return the chainable object for chaining
  mockSelect.mockReturnValue(chainable);
  mockOrder.mockReturnValue(chainable);
  mockRange.mockReturnValue(chainable);
  mockEq.mockReturnValue(chainable);
  mockSingle.mockReturnValue(chainable);
  mockUpdate.mockReturnValue(chainable);
  chainable.from.mockReturnValue(chainable);

  return chainable;
});

const supabaseAdmin = require('../supabaseAdmin');
const { listUsers, getUser, updateUser, disableUser, enableUser } = require('./adminService');

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chainable behavior
    supabaseAdmin.from.mockReturnValue(supabaseAdmin);
    supabaseAdmin.select.mockReturnValue(supabaseAdmin);
    supabaseAdmin.order.mockReturnValue(supabaseAdmin);
    supabaseAdmin.range.mockReturnValue(supabaseAdmin);
    supabaseAdmin.eq.mockReturnValue(supabaseAdmin);
    supabaseAdmin.single.mockReturnValue(supabaseAdmin);
    supabaseAdmin.update.mockReturnValue(supabaseAdmin);
  });

  describe('listUsers', () => {
    it('should return paginated users with metadata', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', first_name: 'User', last_name: 'One', role: 'Paciente', is_active: true },
        { id: '2', email: 'user2@test.com', first_name: 'User', last_name: 'Two', role: 'Doctor', is_active: true },
      ];

      // First call: count query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ count: 10, error: null }),
      });

      // Second call: data query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
          }),
        }),
      });

      const result = await listUsers(1, 2);

      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        total: 10,
        page: 1,
        totalPages: 5,
        limit: 2,
      });
    });

    it('should use default pagination when no params provided', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ count: 0, error: null }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await listUsers();

      expect(result.data).toEqual([]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should throw when count query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ count: null, error: new Error('DB error') }),
      });

      await expect(listUsers(1, 10)).rejects.toThrow('DB error');
    });

    it('should throw when data query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ count: 5, error: null }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
          }),
        }),
      });

      await expect(listUsers(1, 10)).rejects.toThrow('Query failed');
    });
  });

  describe('getUser', () => {
    it('should return user profile data by ID', async () => {
      const mockUser = { id: 'uuid-123', email: 'doc@test.com', first_name: 'Dr', last_name: 'House', role: 'Doctor', is_active: true };

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
          }),
        }),
      });

      const result = await getUser('uuid-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      await expect(getUser('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update allowed fields and return updated user', async () => {
      const mockUpdated = { id: 'uuid-123', email: 'new@test.com', first_name: 'Updated', last_name: 'User', role: 'Paciente', is_active: true };

      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      });

      const result = await updateUser('uuid-123', { first_name: 'Updated', email: 'new@test.com' });
      expect(result).toEqual(mockUpdated);
    });

    it('should filter out non-allowed fields', async () => {
      const mockUpdated = { id: 'uuid-123', first_name: 'Test', last_name: 'User' };
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
          }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        update: mockUpdateFn,
      });

      await updateUser('uuid-123', { first_name: 'Test', password: 'secret', is_active: true });

      // Should not include password or is_active in the update data
      const updateArg = mockUpdateFn.mock.calls[0][0];
      expect(updateArg).not.toHaveProperty('password');
      expect(updateArg).not.toHaveProperty('is_active');
      expect(updateArg).toHaveProperty('first_name', 'Test');
      expect(updateArg).toHaveProperty('updated_at');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      });

      await expect(updateUser('nonexistent', { first_name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('disableUser', () => {
    it('should set is_active to false', async () => {
      const mockDisabled = { id: 'uuid-123', is_active: false };
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockDisabled, error: null }),
          }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        update: mockUpdateFn,
      });

      const result = await disableUser('uuid-123');

      expect(result.is_active).toBe(false);
      const updateArg = mockUpdateFn.mock.calls[0][0];
      expect(updateArg.is_active).toBe(false);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(disableUser('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('enableUser', () => {
    it('should set is_active to true', async () => {
      const mockEnabled = { id: 'uuid-123', is_active: true };
      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockEnabled, error: null }),
          }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        update: mockUpdateFn,
      });

      const result = await enableUser('uuid-123');

      expect(result.is_active).toBe(true);
      const updateArg = mockUpdateFn.mock.calls[0][0];
      expect(updateArg.is_active).toBe(true);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
      });

      await expect(enableUser('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
