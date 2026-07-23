const {
  calculateAvailableSlots,
  generateDaySlots,
  isSlotAvailable,
  isValidDuration,
  timeToMinutes,
  minutesToTime,
  VALID_DURATIONS
} = require('./slotCalculator');

describe('slotCalculator', () => {
  describe('isValidDuration', () => {
    it('should accept 15 as valid duration', () => {
      expect(isValidDuration(15)).toBe(true);
    });

    it('should accept 20 as valid duration', () => {
      expect(isValidDuration(20)).toBe(true);
    });

    it('should accept 30 as valid duration', () => {
      expect(isValidDuration(30)).toBe(true);
    });

    it('should reject invalid durations', () => {
      expect(isValidDuration(10)).toBe(false);
      expect(isValidDuration(25)).toBe(false);
      expect(isValidDuration(45)).toBe(false);
      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(-15)).toBe(false);
    });
  });

  describe('timeToMinutes', () => {
    it('should convert "00:00" to 0', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('should convert "09:00" to 540', () => {
      expect(timeToMinutes('09:00')).toBe(540);
    });

    it('should convert "14:30" to 870', () => {
      expect(timeToMinutes('14:30')).toBe(870);
    });

    it('should convert "23:59" to 1439', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('minutesToTime', () => {
    it('should convert 0 to "00:00"', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('should convert 540 to "09:00"', () => {
      expect(minutesToTime(540)).toBe('09:00');
    });

    it('should convert 870 to "14:30"', () => {
      expect(minutesToTime(870)).toBe('14:30');
    });
  });

  describe('generateDaySlots', () => {
    it('should generate correct number of 30-minute slots for a 2-hour window', () => {
      const slots = generateDaySlots('2024-01-15', '09:00', '11:00', 30);
      expect(slots).toHaveLength(4);
      expect(slots[0]).toEqual({ date: '2024-01-15', startTime: '09:00', endTime: '09:30' });
      expect(slots[1]).toEqual({ date: '2024-01-15', startTime: '09:30', endTime: '10:00' });
      expect(slots[2]).toEqual({ date: '2024-01-15', startTime: '10:00', endTime: '10:30' });
      expect(slots[3]).toEqual({ date: '2024-01-15', startTime: '10:30', endTime: '11:00' });
    });

    it('should generate correct number of 15-minute slots', () => {
      const slots = generateDaySlots('2024-01-15', '09:00', '10:00', 15);
      expect(slots).toHaveLength(4);
      expect(slots[0]).toEqual({ date: '2024-01-15', startTime: '09:00', endTime: '09:15' });
      expect(slots[3]).toEqual({ date: '2024-01-15', startTime: '09:45', endTime: '10:00' });
    });

    it('should generate correct number of 20-minute slots', () => {
      const slots = generateDaySlots('2024-01-15', '09:00', '10:00', 20);
      expect(slots).toHaveLength(3);
      expect(slots[0]).toEqual({ date: '2024-01-15', startTime: '09:00', endTime: '09:20' });
      expect(slots[1]).toEqual({ date: '2024-01-15', startTime: '09:20', endTime: '09:40' });
      expect(slots[2]).toEqual({ date: '2024-01-15', startTime: '09:40', endTime: '10:00' });
    });

    it('should not generate a slot that would exceed endTime', () => {
      // 9:00 to 9:45 with 30 min slots = only 1 slot (9:00-9:30)
      const slots = generateDaySlots('2024-01-15', '09:00', '09:45', 30);
      expect(slots).toHaveLength(1);
      expect(slots[0]).toEqual({ date: '2024-01-15', startTime: '09:00', endTime: '09:30' });
    });

    it('should return empty array for invalid duration', () => {
      const slots = generateDaySlots('2024-01-15', '09:00', '10:00', 25);
      expect(slots).toEqual([]);
    });

    it('should return empty array when window is too small for a single slot', () => {
      const slots = generateDaySlots('2024-01-15', '09:00', '09:10', 15);
      expect(slots).toEqual([]);
    });
  });

  describe('isSlotAvailable', () => {
    const slot = { date: '2024-01-15', startTime: '09:00', endTime: '09:30' };

    it('should return true when no conflicts exist', () => {
      expect(isSlotAvailable(slot, [], [])).toBe(true);
    });

    it('should return false when slot date is a day off', () => {
      expect(isSlotAvailable(slot, [], ['2024-01-15'])).toBe(false);
    });

    it('should return false when slot overlaps with an existing appointment (same time)', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '09:00', end_time: '09:30' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(false);
    });

    it('should return false when slot partially overlaps with appointment', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '09:15', end_time: '09:45' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(false);
    });

    it('should return true when appointment is on a different date', () => {
      const appointments = [
        { date: '2024-01-16', start_time: '09:00', end_time: '09:30' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(true);
    });

    it('should return true when appointment is at a different time (no overlap)', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '10:00', end_time: '10:30' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(true);
    });

    it('should return true when appointment ends exactly when slot starts (adjacent)', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '08:30', end_time: '09:00' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(true);
    });

    it('should return true when appointment starts exactly when slot ends (adjacent)', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '09:30', end_time: '10:00' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(true);
    });

    it('should support appointment_date field format', () => {
      const appointments = [
        { appointment_date: '2024-01-15', start_time: '09:00', end_time: '09:30' }
      ];
      expect(isSlotAvailable(slot, appointments, [])).toBe(false);
    });
  });

  describe('calculateAvailableSlots', () => {
    const baseConfig = {
      startTime: '09:00',
      endTime: '11:00',
      slotDuration: 30,
      workDays: [1, 2, 3, 4, 5] // Mon-Fri
    };

    it('should generate slots only on work days', () => {
      // 2024-01-15 is Monday, 2024-01-21 is Sunday
      const slots = calculateAvailableSlots(
        baseConfig, [], [], '2024-01-15', '2024-01-21'
      );
      // Mon-Fri should have slots, Sat and Sun should not
      const dates = [...new Set(slots.map(s => s.date))];
      expect(dates).toContain('2024-01-15'); // Mon
      expect(dates).toContain('2024-01-16'); // Tue
      expect(dates).toContain('2024-01-17'); // Wed
      expect(dates).toContain('2024-01-18'); // Thu
      expect(dates).toContain('2024-01-19'); // Fri
      expect(dates).not.toContain('2024-01-20'); // Sat
      expect(dates).not.toContain('2024-01-21'); // Sun
    });

    it('should exclude days off', () => {
      const daysOff = ['2024-01-16']; // Tuesday
      const slots = calculateAvailableSlots(
        baseConfig, daysOff, [], '2024-01-15', '2024-01-17'
      );
      const dates = [...new Set(slots.map(s => s.date))];
      expect(dates).toContain('2024-01-15'); // Mon
      expect(dates).not.toContain('2024-01-16'); // Tue (day off)
      expect(dates).toContain('2024-01-17'); // Wed
    });

    it('should exclude slots that overlap with existing appointments', () => {
      const appointments = [
        { date: '2024-01-15', start_time: '09:00', end_time: '09:30' }
      ];
      const slots = calculateAvailableSlots(
        baseConfig, [], appointments, '2024-01-15', '2024-01-15'
      );
      // Should have 3 slots instead of 4 (the 09:00-09:30 is taken)
      expect(slots).toHaveLength(3);
      expect(slots.find(s => s.startTime === '09:00')).toBeUndefined();
      expect(slots.find(s => s.startTime === '09:30')).toBeDefined();
    });

    it('should return empty array for invalid config', () => {
      expect(calculateAvailableSlots(null, [], [], '2024-01-15', '2024-01-15')).toEqual([]);
      expect(calculateAvailableSlots(
        { ...baseConfig, slotDuration: 25 }, [], [], '2024-01-15', '2024-01-15'
      )).toEqual([]);
    });

    it('should handle appointment_date format from DB', () => {
      const appointments = [
        { appointment_date: '2024-01-15', start_time: '09:30', end_time: '10:00' }
      ];
      const slots = calculateAvailableSlots(
        baseConfig, [], appointments, '2024-01-15', '2024-01-15'
      );
      expect(slots).toHaveLength(3);
      expect(slots.find(s => s.startTime === '09:30')).toBeUndefined();
    });

    it('should return correct slot duration', () => {
      const config = { ...baseConfig, slotDuration: 20 };
      const slots = calculateAvailableSlots(
        config, [], [], '2024-01-15', '2024-01-15'
      );
      // 09:00-11:00 with 20 min slots = 6 slots
      expect(slots).toHaveLength(6);
      for (const slot of slots) {
        const startMin = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
        const endMin = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
        expect(endMin - startMin).toBe(20);
      }
    });

    it('should handle null/undefined daysOff and appointments gracefully', () => {
      const slots = calculateAvailableSlots(
        baseConfig, null, null, '2024-01-15', '2024-01-15'
      );
      expect(slots).toHaveLength(4);
    });
  });
});
