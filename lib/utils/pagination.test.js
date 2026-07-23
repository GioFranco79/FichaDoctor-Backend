const { paginate, buildPaginationMeta, DEFAULT_PAGE, DEFAULT_LIMIT } = require('./pagination');

describe('pagination utility', () => {
  describe('paginate()', () => {
    it('should return correct defaults when called without arguments', () => {
      const result = paginate();
      expect(result).toEqual({
        from: 0,
        to: 19,
        page: 1,
        limit: 20
      });
    });

    it('should calculate correct range for page 1 with limit 10', () => {
      const result = paginate(1, 10);
      expect(result).toEqual({
        from: 0,
        to: 9,
        page: 1,
        limit: 10
      });
    });

    it('should calculate correct range for page 2 with limit 10', () => {
      const result = paginate(2, 10);
      expect(result).toEqual({
        from: 10,
        to: 19,
        page: 2,
        limit: 10
      });
    });

    it('should calculate correct range for page 3 with limit 5', () => {
      const result = paginate(3, 5);
      expect(result).toEqual({
        from: 10,
        to: 14,
        page: 3,
        limit: 5
      });
    });

    it('should handle page 0 by defaulting to page 1', () => {
      const result = paginate(0, 10);
      expect(result.page).toBe(1);
      expect(result.from).toBe(0);
    });

    it('should handle negative page by defaulting to page 1', () => {
      const result = paginate(-5, 10);
      expect(result.page).toBe(1);
      expect(result.from).toBe(0);
    });

    it('should handle negative limit by defaulting to 1', () => {
      const result = paginate(1, -10);
      expect(result.limit).toBe(1);
    });

    it('should floor non-integer page and limit values', () => {
      const result = paginate(2.7, 10.9);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.from).toBe(10);
      expect(result.to).toBe(19);
    });

    it('should handle string page and limit by parsing them', () => {
      const result = paginate('3', '15');
      expect(result).toEqual({
        from: 30,
        to: 44,
        page: 3,
        limit: 15
      });
    });

    it('should handle invalid string values by using defaults', () => {
      const result = paginate('abc', 'xyz');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('buildPaginationMeta()', () => {
    it('should calculate correct metadata for basic case', () => {
      const result = buildPaginationMeta(100, 1, 10);
      expect(result).toEqual({
        total: 100,
        page: 1,
        totalPages: 10,
        limit: 10
      });
    });

    it('should calculate totalPages with ceiling division', () => {
      const result = buildPaginationMeta(101, 1, 10);
      expect(result.totalPages).toBe(11);
    });

    it('should handle zero total records', () => {
      const result = buildPaginationMeta(0, 1, 10);
      expect(result).toEqual({
        total: 0,
        page: 1,
        totalPages: 0,
        limit: 10
      });
    });

    it('should handle total less than limit', () => {
      const result = buildPaginationMeta(5, 1, 20);
      expect(result).toEqual({
        total: 5,
        page: 1,
        totalPages: 1,
        limit: 20
      });
    });

    it('should handle exact division (no remainder)', () => {
      const result = buildPaginationMeta(50, 3, 10);
      expect(result).toEqual({
        total: 50,
        page: 3,
        totalPages: 5,
        limit: 10
      });
    });

    it('should handle negative total by defaulting to 0', () => {
      const result = buildPaginationMeta(-10, 1, 10);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle single record with limit 1', () => {
      const result = buildPaginationMeta(1, 1, 1);
      expect(result).toEqual({
        total: 1,
        page: 1,
        totalPages: 1,
        limit: 1
      });
    });

    it('should preserve page even if it exceeds totalPages', () => {
      const result = buildPaginationMeta(10, 5, 10);
      expect(result.page).toBe(5);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('constants', () => {
    it('should export DEFAULT_PAGE as 1', () => {
      expect(DEFAULT_PAGE).toBe(1);
    });

    it('should export DEFAULT_LIMIT as 20', () => {
      expect(DEFAULT_LIMIT).toBe(20);
    });
  });
});
