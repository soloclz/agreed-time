import { useMemo, useRef, useEffect } from 'react';
import {
  addDays,
  parseLocalDate,
  diffInDays,
  formatDateDisplay,
} from '../utils/dateUtils';

interface TimeGridProps {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  startHour: number; // 0-23
  endHour:   number; // 0-23
  slotDuration: number; // in minutes (e.g., 60)
  
  // Callback to provide parent with the scrollable grid element
  onGridMount?: (element: HTMLDivElement | null) => void;

  // Render prop for each cell
  renderCell: (
    date: string, 
    hour: number, 
    slotLabel: string, 
    cellKey: string,
  ) => React.ReactNode;

  // Optional render prop for date header for custom interaction
  renderDateHeader?: (date: string, defaultRenderer: React.ReactNode) => React.ReactNode;

  // Interaction handlers to pass down from parent (TimeSlotSelector) for delegation
  onMouseDown: (e: React.MouseEvent, date: string, hour: number) => void;
  onMouseEnter: (date: string, hour: number) => void;
  onMouseUp: () => void;
}

export default function TimeGrid({
  startDate,
  endDate,
  startHour,
  endHour,
  slotDuration,
  onGridMount,
  renderCell,
  renderDateHeader,
  onMouseDown, 
  onMouseEnter, 
  onMouseUp, 
}: TimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Expose grid element to parent via callback
  useEffect(() => {
    if (onGridMount) {
      onGridMount(gridRef.current);
    } 
  }, [onGridMount]);

  // Generate flat array of days based on date range (timezone-safe)
  const days = useMemo((): string[] => {
    if (!startDate || !endDate) return [];
    
    // We generate days strictly from startDate to endDate
    // No more forcing start-on-Sunday / end-on-Saturday
    const dayList: string[] = [];
    let current = startDate;
    while (current <= endDate) {
      dayList.push(current);
      current = addDays(current, 1);
    }
    return dayList;
  }, [startDate, endDate]);

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
    return null;
  }, [startDate, endDate]);

  const isDateInRange = (dateStr: string): boolean => {
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Helper to generate time slot key
  const getCellKey = (date: string, startTime: string, endTime: string): string =>
    `${date}_${startTime}-${endTime}`;

  // Event Delegation Handlers
  const getCellDataFromEvent = (e: React.MouseEvent) => {
    const targetTd = (e.target as HTMLElement).closest('td[data-date][data-hour]') as HTMLElement | null;
    if (targetTd) {
      const date = targetTd.dataset.date!;
      const hour = parseFloat(targetTd.dataset.hour!);
      return { date, hour, originalEvent: e };
    }
    return null;
  };

  const handleGridMouseDown = (e: React.MouseEvent) => {
    const cellData = getCellDataFromEvent(e);
    if (cellData) {
      onMouseDown(cellData.originalEvent, cellData.date, cellData.hour);
    }
  };

  const handleGridMouseEnter = (e: React.MouseEvent) => {
    const cellData = getCellDataFromEvent(e);
    if (cellData) {
      onMouseEnter(cellData.date, cellData.hour);
    } else {
      onMouseUp(); 
    }
  };

  const handleGridMouseUp = () => {
    onMouseUp();
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink">
      {dateRangeError && <p className="text-xs text-red-600 mt-2 font-mono font-bold">{dateRangeError}</p>}
      
      {!dateRangeError && (
        <div className="flex border border-film-border bg-paper relative overflow-hidden rounded-sm shadow-sm max-w-full">
          {/* Left: Fixed Time Column */}
          <div className="flex-shrink-0 z-30 bg-paper border-r border-film-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] sticky left-0">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-film-border bg-paper px-2 sm:px-3 text-xs font-mono font-bold text-ink h-12 box-border align-middle min-w-[3.5rem] sm:min-w-[4.5rem]">
                    TIME
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, index) => (
                  <tr key={index}>
                    <th className="border-b border-film-border bg-paper px-2 sm:px-3 text-[10px] sm:text-xs font-mono text-ink text-right h-12 box-border last:border-b-0 align-middle">
                      {slot.label}
                    </th>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: Scrollable Grid (Rolling Canvas) */}
          <div
            ref={gridRef}
            className="time-grid-scroll-area overflow-x-auto flex-1 min-w-0 select-none snap-x snap-mandatory scroll-smooth"
            style={{ WebkitTouchCallout: 'none' }}
            onMouseDown={handleGridMouseDown}
            onMouseOver={handleGridMouseEnter}
            onMouseUp={handleGridMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <table className="border-collapse w-max">
              <thead>
                <tr>
                  {days.map(date => {
                    const defaultHeader = (
                      <div className="w-full h-full px-2 sm:px-4 flex items-center justify-center min-w-[4rem] sm:min-w-[6rem]">
                        {formatDateDisplay(date)}
                      </div>
                    );
                    return (
                      <th
                        key={date}
                        data-date={date}
                        className="border-b border-r border-film-border p-0 text-xs font-serif font-bold whitespace-pre-line text-center h-12 box-border last:border-r-0 bg-paper text-ink snap-start scroll-ml-14"
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
                    {days.map(date => {
                      const { startTime, endTime } = getCellKeyParts(slot.startHour, slotDuration);
                      const key = getCellKey(date, startTime, endTime);
                      return (
                        renderCell(
                          date,
                          slot.startHour,
                          slot.label,
                          key,
                        )
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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