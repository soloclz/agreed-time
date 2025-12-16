import { addDays, diffInDays } from './dateUtils';
import { getCellKey } from './eventUtils';

interface MergeWeek1PatternParams {
  selectedCells: Set<string>;
  startDate: string;
  endDate: string;
  startHour: number;
  endHour: number;
  slotDuration: number;
}

interface MergeWeek1PatternResult {
  mergedSelectedCells: Set<string>;
  hasWeek1Pattern: boolean;
  addedCount: number;
}

export function mergeWeek1PatternIntoFollowingWeeks({
  selectedCells,
  startDate,
  endDate,
  startHour,
  endHour,
  slotDuration,
}: MergeWeek1PatternParams): MergeWeek1PatternResult {
  const durationInHours = slotDuration / 60;

  const pattern = new Map<number, Set<number>>();
  let hasWeek1Pattern = false;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = addDays(startDate, dayOffset);
    if (date > endDate) break;

    const dayPattern = new Set<number>();
    let currentHour = startHour;
    while (currentHour < endHour) {
      if (selectedCells.has(getCellKey(date, currentHour))) {
        dayPattern.add(currentHour);
        hasWeek1Pattern = true;
      }
      currentHour += durationInHours;
    }

    if (dayPattern.size > 0) {
      pattern.set(dayOffset, dayPattern);
    }
  }

  const mergedSelectedCells = new Set(selectedCells);

  if (!hasWeek1Pattern) {
    return { mergedSelectedCells, hasWeek1Pattern, addedCount: 0 };
  }

  const totalDaysInRange = diffInDays(startDate, endDate) + 1;
  if (totalDaysInRange <= 7) {
    return { mergedSelectedCells, hasWeek1Pattern, addedCount: 0 };
  }

  let addedCount = 0;
  for (let dayOffset = 7; dayOffset < totalDaysInRange; dayOffset++) {
    const date = addDays(startDate, dayOffset);
    const patternDayIndex = dayOffset % 7;
    const hoursToSelect = pattern.get(patternDayIndex);

    if (!hoursToSelect) continue;

    hoursToSelect.forEach(hour => {
      const key = getCellKey(date, hour);
      if (!mergedSelectedCells.has(key)) {
        mergedSelectedCells.add(key);
        addedCount += 1;
      }
    });
  }

  return { mergedSelectedCells, hasWeek1Pattern, addedCount };
}
