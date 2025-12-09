import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  formatLocalDate,
  addDays,
  getDayOfWeek,
  formatDateDisplay,
  getFirstSunday,
  getLastSaturday,
  diffInDays,
  formatHour,
  formatHourTime,
  getTimezoneOffsetString,
} from './dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('should parse date string as local midnight', () => {
      const date = parseLocalDate('2025-12-09');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11); // 0-indexed
      expect(date.getDate()).toBe(9);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });

    it('should handle single digit months and days', () => {
      const date = parseLocalDate('2025-01-05');
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(5);
    });
  });

  describe('formatLocalDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 11, 9); // Dec 9, 2025
      expect(formatLocalDate(date)).toBe('2025-12-09');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatLocalDate(date)).toBe('2025-01-05');
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      expect(addDays('2025-12-09', 7)).toBe('2025-12-16');
    });

    it('should subtract negative days', () => {
      expect(addDays('2025-12-09', -7)).toBe('2025-12-02');
    });

    it('should handle month boundaries', () => {
      expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
      expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
    });

    it('should handle leap years', () => {
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    });
  });

  describe('getDayOfWeek', () => {
    it('should return correct day of week', () => {
      // Dec 9, 2025 is Tuesday (2)
      expect(getDayOfWeek('2025-12-09')).toBe(2);
      // Dec 7, 2025 is Sunday (0)
      expect(getDayOfWeek('2025-12-07')).toBe(0);
      // Dec 13, 2025 is Saturday (6)
      expect(getDayOfWeek('2025-12-13')).toBe(6);
    });
  });

  describe('formatDateDisplay', () => {
    it('should format date with day and date', () => {
      expect(formatDateDisplay('2025-12-09')).toBe('Tue\n12/9');
      expect(formatDateDisplay('2025-12-07')).toBe('Sun\n12/7');
    });

    it('should handle single digit dates', () => {
      expect(formatDateDisplay('2025-01-05')).toBe('Sun\n1/5');
    });
  });

  describe('getFirstSunday', () => {
    it('should return the same date if it is Sunday', () => {
      expect(getFirstSunday('2025-12-07')).toBe('2025-12-07');
    });

    it('should return previous Sunday for other days', () => {
      expect(getFirstSunday('2025-12-09')).toBe('2025-12-07'); // Tue -> Sun
      expect(getFirstSunday('2025-12-13')).toBe('2025-12-07'); // Sat -> Sun
    });
  });

  describe('getLastSaturday', () => {
    it('should return the same date if it is Saturday', () => {
      expect(getLastSaturday('2025-12-13')).toBe('2025-12-13');
    });

    it('should return next Saturday for other days', () => {
      expect(getLastSaturday('2025-12-07')).toBe('2025-12-13'); // Sun -> Sat
      expect(getLastSaturday('2025-12-09')).toBe('2025-12-13'); // Tue -> Sat
    });
  });

  describe('diffInDays', () => {
    it('should calculate positive difference', () => {
      expect(diffInDays('2025-12-09', '2025-12-16')).toBe(7);
    });

    it('should calculate negative difference', () => {
      expect(diffInDays('2025-12-16', '2025-12-09')).toBe(-7);
    });

    it('should return 0 for same date', () => {
      expect(diffInDays('2025-12-09', '2025-12-09')).toBe(0);
    });

    it('should handle month boundaries', () => {
      expect(diffInDays('2025-12-31', '2026-01-01')).toBe(1);
    });
  });

  describe('formatHour', () => {
    it('should format midnight as 12 AM', () => {
      expect(formatHour(0)).toBe('12 AM');
    });

    it('should format morning hours', () => {
      expect(formatHour(1)).toBe('1 AM');
      expect(formatHour(9)).toBe('9 AM');
      expect(formatHour(11)).toBe('11 AM');
    });

    it('should format noon as 12 PM', () => {
      expect(formatHour(12)).toBe('12 PM');
    });

    it('should format afternoon/evening hours', () => {
      expect(formatHour(13)).toBe('1 PM');
      expect(formatHour(18)).toBe('6 PM');
      expect(formatHour(23)).toBe('11 PM');
    });
  });

  describe('formatHourTime', () => {
    it('should format hour with leading zero', () => {
      expect(formatHourTime(0)).toBe('00:00');
      expect(formatHourTime(9)).toBe('09:00');
      expect(formatHourTime(12)).toBe('12:00');
      expect(formatHourTime(23)).toBe('23:00');
    });
  });

  describe('getTimezoneOffsetString', () => {
    it('should return timezone string in GMT format', () => {
      const result = getTimezoneOffsetString();
      expect(result).toMatch(/^GMT[+-]\d{2}:\d{2}$/);
    });

    it('should have correct format structure', () => {
      const result = getTimezoneOffsetString();
      expect(result.startsWith('GMT')).toBe(true);
      expect(result).toContain(':');
    });
  });
});
