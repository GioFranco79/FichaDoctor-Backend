const {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
} = require('./appointmentSchemas');

describe('appointmentSchemas', () => {
  describe('createAppointmentSchema', () => {
    it('should validate a correct create appointment payload', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '2024-12-15',
        start_time: '09:30',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should accept optional notes field', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '2024-12-15',
        start_time: '14:00',
        notes: 'Primera consulta',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject missing doctor_id', () => {
      const payload = {
        appointment_date: '2024-12-15',
        start_time: '09:30',
      };
      const { error } = createAppointmentSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('doctor_id');
    });

    it('should reject invalid doctor_id (not UUID)', () => {
      const payload = {
        doctor_id: 'not-a-uuid',
        appointment_date: '2024-12-15',
        start_time: '09:30',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('doctor_id');
    });

    it('should reject missing appointment_date', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        start_time: '09:30',
      };
      const { error } = createAppointmentSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('appointment_date');
    });

    it('should reject invalid date format', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '15-12-2024',
        start_time: '09:30',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('appointment_date');
    });

    it('should reject missing start_time', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '2024-12-15',
      };
      const { error } = createAppointmentSchema.validate(payload, { abortEarly: false });
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('start_time');
    });

    it('should reject invalid time format', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '2024-12-15',
        start_time: '25:00',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('start_time');
    });

    it('should reject time with seconds format', () => {
      const payload = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_date: '2024-12-15',
        start_time: '09:30:00',
      };
      const { error } = createAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('start_time');
    });
  });

  describe('updateAppointmentSchema', () => {
    it('should validate with only appointment_date', () => {
      const payload = { appointment_date: '2024-12-20' };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with only start_time', () => {
      const payload = { start_time: '10:00' };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with only notes', () => {
      const payload = { notes: 'Nota actualizada' };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should validate with multiple fields', () => {
      const payload = {
        appointment_date: '2024-12-20',
        start_time: '11:30',
        notes: 'Reagendada',
      };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject empty object (at least one field required)', () => {
      const payload = {};
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('object.min');
    });

    it('should reject invalid date format', () => {
      const payload = { appointment_date: '12/20/2024' };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
    });

    it('should reject invalid time format', () => {
      const payload = { start_time: '9:30' };
      const { error } = updateAppointmentSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe('changeStatusSchema', () => {
    it('should accept "pendiente" status', () => {
      const { error } = changeStatusSchema.validate({ status: 'pendiente' });
      expect(error).toBeUndefined();
    });

    it('should accept "confirmada" status', () => {
      const { error } = changeStatusSchema.validate({ status: 'confirmada' });
      expect(error).toBeUndefined();
    });

    it('should accept "completada" status', () => {
      const { error } = changeStatusSchema.validate({ status: 'completada' });
      expect(error).toBeUndefined();
    });

    it('should accept "cancelada" status', () => {
      const { error } = changeStatusSchema.validate({ status: 'cancelada' });
      expect(error).toBeUndefined();
    });

    it('should reject missing status', () => {
      const { error } = changeStatusSchema.validate({});
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('status');
    });

    it('should reject invalid status value', () => {
      const { error } = changeStatusSchema.validate({ status: 'en_progreso' });
      expect(error).toBeDefined();
      expect(error.details[0].type).toBe('any.only');
    });

    it('should reject empty string status', () => {
      const { error } = changeStatusSchema.validate({ status: '' });
      expect(error).toBeDefined();
    });
  });
});
