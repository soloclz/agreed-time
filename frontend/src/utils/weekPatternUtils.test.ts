import { describe, expect, it } from 'vitest';
import { mergeWeek1PatternIntoFollowingWeeks } from './weekPatternUtils';
import { getCellKey } from './eventUtils';

const toSorted = (s: Set<string>) => Array.from(s).sort();

describe('weekPatternUtils', () => {
  describe('mergeWeek1PatternIntoFollowingWeeks', () => {
    it('does nothing when the range is only 1 week', () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-07';

      const selectedCells = new Set<string>([
        getCellKey('2025-12-01', 9),
        getCellKey('2025-12-02', 10),
      ]);

      const result = mergeWeek1PatternIntoFollowingWeeks({
        selectedCells,
        startDate,
        endDate,
        startHour: 9,
        endHour: 12,
        slotDuration: 60,
      });

      expect(result.hasWeek1Pattern).toBe(true);
      expect(result.addedCount).toBe(0);
      expect(toSorted(result.mergedSelectedCells)).toEqual(toSorted(selectedCells));
    });

    it('merges week 1 pattern into week 2 without overwriting week 2', () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-14';

      const selectedCells = new Set<string>([
        // Week 1 pattern
        getCellKey('2025-12-01', 9), // day 0
        getCellKey('2025-12-02', 10), // day 1
        // Existing week 2 selection (should be preserved)
        getCellKey('2025-12-09', 11),
      ]);

      const result = mergeWeek1PatternIntoFollowingWeeks({
        selectedCells,
        startDate,
        endDate,
        startHour: 9,
        endHour: 12,
        slotDuration: 60,
      });

      expect(result.hasWeek1Pattern).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-08', 9))).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-09', 10))).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-09', 11))).toBe(true);
    });

    it('does not add any cells beyond endDate', () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-20';

      const selectedCells = new Set<string>([getCellKey('2025-12-01', 9)]);

      const result = mergeWeek1PatternIntoFollowingWeeks({
        selectedCells,
        startDate,
        endDate,
        startHour: 9,
        endHour: 10,
        slotDuration: 60,
      });

      expect(result.hasWeek1Pattern).toBe(true);
      // Week 4 Monday would be 2025-12-22 (out of range)
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-22', 9))).toBe(false);
    });

    it('treats week 1 as the first 7 days from startDate', () => {
      const startDate = '2025-12-16'; // Tue
      const endDate = '2025-12-26'; // Fri

      const selectedCells = new Set<string>([
        // Week 1 pattern only on Tue-Fri at 11
        getCellKey('2025-12-16', 11),
        getCellKey('2025-12-17', 11),
        getCellKey('2025-12-18', 11),
        getCellKey('2025-12-19', 11),
      ]);

      const result = mergeWeek1PatternIntoFollowingWeeks({
        selectedCells,
        startDate,
        endDate,
        startHour: 9,
        endHour: 18,
        slotDuration: 60,
      });

      // Since week 1 is 2025-12-16..2025-12-22 (7 days), copy should start on 2025-12-23.
      // Ensure 2025-12-22 wasn't modified by copy.
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-22', 11))).toBe(false);

      // Tue-Fri should be copied into the next calendar week.
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-23', 11))).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-24', 11))).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-25', 11))).toBe(true);
      expect(result.mergedSelectedCells.has(getCellKey('2025-12-26', 11))).toBe(true);
    });
  });
});
