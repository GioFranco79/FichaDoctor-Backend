const {
  scheduleConfigSchema,
  dayOffSchema,
  availabilityQuerySchema,
} = require('./scheduleSchemas');

describe('scheduleSchemas', () => {
  describe('scheduleConfigSchema', () => {
    it('should validate a correct schedule configuration', () => {
      const validConfig = {
        workDays: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '17:00',
        slotDuration: 30,
      };

      const { error, value } = scheduleConfigSchema.validate(validConfig);
      expect(error).toBeUndefined();
      expect(value).toEqual(validConfig);
    });

    it('should accept slotDuration of 15', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 15,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeUndefined();
    });

    it('should accept slotDuration of 20', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 20,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeUndefined();
    });

    it('should reject slotDuration of 25', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 25,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('15, 20 o 30');
    });

    it('should reject slotDuration of 10', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 10,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
    });

    it('should reject slotDuration of 60', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 60,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
    });

    it('should require workDays', () => {
      const config = {
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 30,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('workDays');
    });

    it('should reject empty workDays array', () => {
      const config = {
        workDays: [],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 30,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
    });

    it('should reject workDays with values outside 0-6', () => {
      const config = {
        workDays: [1, 7],
        startTime: '09:00',
        endTime: '18:00',
        slotDuration: 30,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
    });

    it('should reject invalid startTime format', () => {
      const config = {
        workDays: [1],
        startTime: '9:00',
        endTime: '18:00',
        slotDuration: 30,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('HH:mm');
    });

    it('should reject invalid endTime format', () => {
      const config = {
        workDays: [1],
        startTime: '09:00',
        endTime: '25:00',
        slotDuration: 30,
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
    });

    it('should require slotDuration', () => {
      const config = {
        workDays: [1, 2, 3],
        startTime: '09:00',
        endTime: '18:00',
      };

      const { error } = scheduleConfigSchema.validate(config);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('slotDuration');
    });
  });

  describe('dayOffSchema', () => {
    it('should validate a correct day off with reason', () => {
      const validDayOff = {
        date: '2024-12-25',
        reason: 'Navidad',
      };

      const { error, value } = dayOffSchema.validate(validDayOff);
      expect(error).toBeUndefined();
      expect(value).toEqual(validDayOff);
    });

    it('should validate a day off without reason', () => {
      const dayOff = {
        date: '2024-01-01',
      };

      const { error } = dayOffSchema.validate(dayOff);
      expect(error).toBeUndefined();
    });

    it('should require date', () => {
      const dayOff = {
        reason: 'Vacaciones',
      };

      const { error } = dayOffSchema.validate(dayOff);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('date');
    });

    it('should reject invalid date format', () => {
      const dayOff = {
        date: '25-12-2024',
      };

      const { error } = dayOffSchema.validate(dayOff);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('YYYY-MM-DD');
    });

    it('should reject reason longer than 255 characters', () => {
      const dayOff = {
        date: '2024-06-15',
        reason: 'a'.repeat(256),
      };

      const { error } = dayOffSchema.validate(dayOff);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('255');
    });

    it('should allow empty string as reason', () => {
      const dayOff = {
        date: '2024-06-15',
        reason: '',
      };

      const { error } = dayOffSchema.validate(dayOff);
      expect(error).toBeUndefined();
    });
  });

  describe('availabilityQuerySchema', () => {
    it('should validate a correct availability query', () => {
      const validQuery = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const { error, value } = availabilityQuerySchema.validate(validQuery);
      expect(error).toBeUndefined();
      expect(value).toEqual(validQuery);
    });

    it('should validate with optional doctor_id', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const { error } = availabilityQuerySchema.validate(query);
      expect(error).toBeUndefined();
    });

    it('should require startDate', () => {
      const query = {
        endDate: '2024-01-31',
      };

      const { error } = availabilityQuerySchema.validate(query);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('startDate');
    });

    it('should require endDate', () => {
      const query = {
        startDate: '2024-01-01',
      };

      const { error } = availabilityQuerySchema.validate(query);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('endDate');
    });

    it('should reject invalid startDate format', () => {
      const query = {
        startDate: '01-01-2024',
        endDate: '2024-01-31',
      };

      const { error } = availabilityQuerySchema.validate(query);
      expect(error).toBeDefined();
    });

    it('should reject invalid doctor_id format', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        doctor_id: 'not-a-uuid',
      };

      const { error } = availabilityQuerySchema.validate(query);
      expect(error).toBeDefined();
    });
  });
});
