import { useMemo, useRef } from 'react';
import {
  addDays,
  parseLocalDate,
  getFirstSunday,
  getLastSaturday,
  diffInDays,
  formatDateDisplay,
  formatHour,
} from '../utils/dateUtils';

interface Week {
  weekNumber: number;
  startDate: Date;
  dates: string[];
}

interface TimeGridProps {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  startHour: number; // 0-23
  endHour:   number; // 0-23
  slotDuration: number; // in minutes (e.g., 60)
  maxWeeks?: number; // max number of weeks to display, default 8

  // Render prop for each cell
  renderCell: (
    date: string, 
    hour: number, 
    slotLabel: string, 
    cellKey: string,
    // Mouse event handlers from parent for consistent drag behavior
    onMouseDown: (e: React.MouseEvent, date: string, hour: number) => void,
    onMouseEnter: (date: string, hour: number) => void,
    onMouseUp: () => void,
  ) => React.ReactNode;

  // Optional render prop for date header for custom interaction
  renderDateHeader?: (date: string, defaultRenderer: React.ReactNode) => React.ReactNode;

  // Interaction handlers to pass down to renderCell
  onMouseDown: (e: React.MouseEvent, date: string, hour: number) => void;
  onMouseEnter: (date: string, hour: number) => void;
  onMouseUp: () => void;
}

const MAX_WEEKS_DEFAULT = 8;

export default function TimeGrid({
  startDate,
  endDate,
  startHour,
  endHour,
  slotDuration,
  maxWeeks = MAX_WEEKS_DEFAULT,
  renderCell,
  renderDateHeader,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: TimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate weeks based on date range (timezone-safe)
  const weeks = useMemo((): Week[] => {
    if (!startDate || !endDate) return [];

    const firstSundayStr = getFirstSunday(startDate);
    const lastSaturdayStr = getLastSaturday(endDate);

    const weeksArray: Week[] = [];
    let currentDateStr = firstSundayStr;
    let weekNum = 0;

    while (currentDateStr <= lastSaturdayStr && weekNum < maxWeeks) {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        weekDates.push(addDays(currentDateStr, i));
      }
      weeksArray.push({
        weekNumber: weekNum,
        startDate: parseLocalDate(currentDateStr),
        dates: weekDates,
      });
      currentDateStr = addDays(currentDateStr, 7);
      weekNum++;
    }
    return weeksArray;
  }, [startDate, endDate, maxWeeks]);

  // Generate time slots based on slotDuration
  const timeSlots = useMemo(() => {
    const result: Array<{ startHour: number; endHour: number; label: string }> = [];
    const durationInHours = slotDuration / 60;

    let currentHour = startHour;
    while (currentHour < endHour) {
      const nextHour = Math.min(currentHour + durationInHours, endHour);

      const startMinutes = Math.floor((currentHour % 1) * 60);
      const endMinutes = Math.floor((nextHour % 1) * 60);
      const startHourInt = Math.floor(currentHour);
      const endHourInt = Math.floor(nextHour);

      const startLabel = `${String(startHourInt).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`;
      const endLabel = `${String(endHourInt).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

      result.push({
        startHour: currentHour,
        endHour: nextHour,
        label: `${startLabel}-${endLabel}`,
      });

      currentHour = nextHour;
    }
    return result;
  }, [startHour, endHour, slotDuration]);

  // Validate date range
  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) return null;

    if (endDate < startDate) return 'End date cannot be before start date';

    const days = diffInDays(startDate, endDate);
    const diffWeeks = Math.ceil(days / 7);

    if (diffWeeks > maxWeeks) return `Date range cannot exceed ${maxWeeks} weeks`;
    return null;
  }, [startDate, endDate, maxWeeks]);

  const isDateInRange = (dateStr: string): boolean => {
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Helper to generate time slot key
  const getCellKey = (date: string, startTime: string, endTime: string): string =>
    `${date}_${startTime}-${endTime}`;

  const formatWeekRange = (week: Week): string => {
    const start = parseLocalDate(week.dates[0]);
    const end = parseLocalDate(week.dates[6]);
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink">
      {weeks.length > 1 && (
        <div className="flex items-center justify-between font-mono text-xs sm:text-sm gap-2">
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: -800, behavior: 'smooth' });
              }
            }}
            className="px-3 sm:px-4 py-2 border border-film-border bg-paper hover:bg-film-light flex items-center gap-1 sm:gap-2 transition-colors active:translate-y-0.5 text-xs sm:text-sm"
            aria-label="Scroll to previous week"
          >
            ← <span className="hidden sm:inline">PREV</span>
          </button>
          <span className="text-ink font-bold text-xs sm:text-sm">
            {weeks.length} {weeks.length === 1 ? 'WEEK' : 'WEEKS'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: 800, behavior: 'smooth' });
              }
            }}
            className="px-3 sm:px-4 py-2 border border-film-border bg-paper hover:bg-film-light flex items-center gap-1 sm:gap-2 transition-colors active:translate-y-0.5 text-xs sm:text-sm"
            aria-label="Scroll to next week"
          >
            <span className="hidden sm:inline">NEXT</span> →
          </button>
        </div>
      )}

      {dateRangeError && <p className="text-xs text-red-600 mt-2 font-mono font-bold">{dateRangeError}</p>}
      
      {!dateRangeError && (
        <div className="flex border border-film-border bg-paper relative overflow-hidden rounded-sm">
          {/* Left: Fixed Time Column */}
          <div className="flex-shrink-0 z-30 bg-paper border-r border-film-border shadow-sm">
            <div className="bg-paper px-3 py-3 text-sm font-serif font-bold text-transparent border-b border-film-border tracking-wide select-none">
              &nbsp;
            </div>
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-film-border bg-paper px-3 text-xs font-mono font-bold text-ink h-12 box-border align-middle">
                    TIME
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, index) => (
                  <tr key={index}>
                    <th className="border-b border-film-border bg-paper px-3 text-xs font-mono text-ink text-right h-12 box-border last:border-b-0 align-middle">
                      {slot.label}
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Scrollable Grid */}
          <div
            ref={gridRef}
            className="overflow-x-auto flex-1"
          >
            <div className="flex">
              {weeks.map((week, weekIndex) => (
                <div
                  key={week.weekNumber}
                  className={`flex-shrink-0 ${weekIndex > 0 ? 'border-l border-film-border' : ''}`}
                >
                  <div className="bg-paper px-4 py-3 text-sm font-serif font-bold text-ink border-b border-film-border tracking-wide whitespace-nowrap">
                    WEEK {week.weekNumber + 1}: {formatWeekRange(week)}
                  </div>

                  <table className="border-collapse">
                    <thead>
                      <tr>
                        {week.dates.map(date => {
                          const inRange = isDateInRange(date);
                          const defaultHeader = (
                                <div className="w-full h-full px-4 flex items-center justify-center">
                                  {formatDateDisplay(date)}
                                </div>
                          );
                          return (
                            <th
                              key={date}
                              className={`border-b border-r border-film-border p-0 text-xs font-serif font-bold whitespace-pre-line text-center h-12 box-border last:border-r-0 ${inRange ? 'bg-paper text-ink' : 'bg-gray-100/80 text-gray-400'}`}
                            >
                              {renderDateHeader ? renderDateHeader(date, defaultHeader) : defaultHeader}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, slotIndex) => (
                        <tr key={slotIndex}>
                          {week.dates.map(date => {
                            const { startTime, endTime } = getCellKeyParts(slot.startHour, slotDuration);
                            const key = getCellKey(date, startTime, endTime);
                            return (
                                renderCell(
                                    date,
                                    slot.startHour,
                                    slot.label,
                                    key,
                                    onMouseDown,
                                    onMouseEnter,
                                    onMouseUp,
                                )
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to convert hour to time slot with duration, returns parts for getCellKey
const getCellKeyParts = (hour: number, duration: number): { startTime: string; endTime: string } => {
  const startMinutes = Math.floor((hour % 1) * 60);
  const startHour = Math.floor(hour);
  const totalMinutes = startHour * 60 + startMinutes + duration;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  return {
    startTime: `${String(startHour).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`,
  };
};