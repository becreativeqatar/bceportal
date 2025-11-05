import { formatDate, formatDateTime, parseDate } from '../date-format';

describe('Date Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format date to dd/mm/yyyy format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should handle null dates', () => {
      const result = formatDate(null);
      expect(result).toBe('N/A');
    });

    it('should handle undefined dates', () => {
      const result = formatDate(undefined);
      expect(result).toBe('N/A');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('2024');
      expect(formatted).toContain(':');
    });

    it('should handle null dates', () => {
      const result = formatDateTime(null);
      expect(result).toBe('N/A');
    });
  });

  describe('parseDate', () => {
    it('should parse date string correctly', () => {
      const dateString = '2024-01-15';
      const parsed = parseDate(dateString);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getFullYear()).toBe(2024);
    });

    it('should return null for invalid dates', () => {
      const result = parseDate('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for empty strings', () => {
      const result = parseDate('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = parseDate(null);
      expect(result).toBeNull();
    });
  });
});
