const { sendMessageSchema } = require('./messageSchemas');

describe('messageSchemas', () => {
  describe('sendMessageSchema', () => {
    it('should validate a correct send message payload', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Hola, tengo una consulta sobre mi próxima cita.',
      };
      const { error } = sendMessageSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should accept content with minimum 1 character', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'H',
      };
      const { error } = sendMessageSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject missing recipient_id', () => {
      const payload = {
        content: 'Un mensaje sin destinatario',
      };
      const { error } = sendMessageSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('recipient_id');
    });

    it('should reject invalid recipient_id (not UUID)', () => {
      const payload = {
        recipient_id: 'not-a-uuid',
        content: 'Mensaje con UUID inválido',
      };
      const { error } = sendMessageSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('recipient_id');
    });

    it('should reject missing content', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
      };
      const { error } = sendMessageSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('content');
    });

    it('should reject empty string content', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '',
      };
      const { error } = sendMessageSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('content');
    });

    it('should reject whitespace-only content', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '   ',
      };
      const { error } = sendMessageSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('content');
    });

    it('should trim content and still validate min length', () => {
      const payload = {
        recipient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '  a  ',
      };
      const { error, value } = sendMessageSchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.content).toBe('a');
    });
  });
});
