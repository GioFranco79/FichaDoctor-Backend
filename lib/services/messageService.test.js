const { NotFoundError, AuthorizationError } = require('../errors');

// Mock supabaseAdmin
jest.mock('../supabaseAdmin', () => {
  const chainable = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    single: jest.fn(),
  };

  chainable.from.mockReturnValue(chainable);
  chainable.select.mockReturnValue(chainable);
  chainable.insert.mockReturnValue(chainable);
  chainable.update.mockReturnValue(chainable);
  chainable.eq.mockReturnValue(chainable);
  chainable.order.mockReturnValue(chainable);
  chainable.range.mockReturnValue(chainable);
  chainable.single.mockReturnValue(chainable);

  return chainable;
});

const supabaseAdmin = require('../supabaseAdmin');
const { send, getInbox, getSent, markAsRead } = require('./messageService');

describe('messageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabaseAdmin.from.mockReturnValue(supabaseAdmin);
    supabaseAdmin.select.mockReturnValue(supabaseAdmin);
    supabaseAdmin.insert.mockReturnValue(supabaseAdmin);
    supabaseAdmin.update.mockReturnValue(supabaseAdmin);
    supabaseAdmin.eq.mockReturnValue(supabaseAdmin);
    supabaseAdmin.order.mockReturnValue(supabaseAdmin);
    supabaseAdmin.range.mockReturnValue(supabaseAdmin);
    supabaseAdmin.single.mockReturnValue(supabaseAdmin);
  });

  describe('send', () => {
    it('should create a message and return it', async () => {
      const mockMessage = {
        id: 'msg-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: 'Hola, ¿cómo está?',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      supabaseAdmin.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      });

      const result = await send('user-a', 'user-b', 'Hola, ¿cómo está?');

      expect(result).toEqual(mockMessage);
      expect(result.sender_id).toBe('user-a');
      expect(result.recipient_id).toBe('user-b');
      expect(result.is_read).toBe(false);
    });

    it('should throw when insert fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      });

      await expect(send('user-a', 'user-b', 'Mensaje')).rejects.toThrow('DB error');
    });
  });

  describe('getInbox', () => {
    it('should return paginated inbox messages for the user', async () => {
      const mockMessages = [
        { id: 'msg-1', sender_id: 'user-a', recipient_id: 'user-b', content: 'Hola', is_read: false, created_at: '2024-01-02T00:00:00Z' },
        { id: 'msg-2', sender_id: 'user-c', recipient_id: 'user-b', content: 'Buenos días', is_read: true, created_at: '2024-01-01T00:00:00Z' },
      ];

      // Count query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      });

      // Data query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
        }),
      });

      const result = await getInbox('user-b', 1, 2);

      expect(result.data).toEqual(mockMessages);
      expect(result.pagination).toEqual({
        total: 5,
        page: 1,
        totalPages: 3,
        limit: 2,
      });
    });

    it('should use default pagination when no params provided', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await getInbox('user-b');

      expect(result.data).toEqual([]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should throw when count query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: null, error: new Error('Count failed') }),
        }),
      });

      await expect(getInbox('user-b', 1, 10)).rejects.toThrow('Count failed');
    });

    it('should throw when data query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
            }),
          }),
        }),
      });

      await expect(getInbox('user-b', 1, 10)).rejects.toThrow('Query failed');
    });
  });

  describe('getSent', () => {
    it('should return paginated sent messages for the user', async () => {
      const mockMessages = [
        { id: 'msg-3', sender_id: 'user-a', recipient_id: 'user-b', content: 'Enviado 1', is_read: true, created_at: '2024-01-02T00:00:00Z' },
      ];

      // Count query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      });

      // Data query
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
        }),
      });

      const result = await getSent('user-a', 1, 10);

      expect(result.data).toEqual(mockMessages);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        totalPages: 1,
        limit: 10,
      });
    });

    it('should throw when count query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: null, error: new Error('Count error') }),
        }),
      });

      await expect(getSent('user-a', 1, 10)).rejects.toThrow('Count error');
    });

    it('should throw when data query fails', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      });

      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: null, error: new Error('Query error') }),
            }),
          }),
        }),
      });

      await expect(getSent('user-a', 1, 10)).rejects.toThrow('Query error');
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read when user is the recipient', async () => {
      const mockMessage = {
        id: 'msg-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: 'Test',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdated = { ...mockMessage, is_read: true };

      // Fetch message
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      });

      // Update message
      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdated, error: null }),
            }),
          }),
        }),
      });

      const result = await markAsRead('msg-1', 'user-b');

      expect(result.is_read).toBe(true);
    });

    it('should throw AuthorizationError when user is not the recipient', async () => {
      const mockMessage = {
        id: 'msg-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: 'Test',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Fetch message
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      });

      await expect(markAsRead('msg-1', 'user-c')).rejects.toThrow(AuthorizationError);
    });

    it('should throw NotFoundError when message does not exist', async () => {
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      await expect(markAsRead('nonexistent', 'user-b')).rejects.toThrow(NotFoundError);
    });

    it('should throw when update query fails', async () => {
      const mockMessage = {
        id: 'msg-1',
        sender_id: 'user-a',
        recipient_id: 'user-b',
        content: 'Test',
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      // Fetch message
      supabaseAdmin.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      });

      // Update fails
      supabaseAdmin.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
            }),
          }),
        }),
      });

      await expect(markAsRead('msg-1', 'user-b')).rejects.toThrow('Update failed');
    });
  });
});
