import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import TimeSlotCell from './TimeSlotCell';
import TimeGrid from './TimeGrid';
import {
  getTodayLocal,
  addDays,
  formatHour,
} from '../utils/dateUtils';
import { useTimeSlotDragSelection } from '../hooks/useTimeSlotDragSelection';

// Helper to generate time slot key
const getCellKey = (date: string, startTime: string, endTime: string): string =>
  `${date}_${startTime}-${endTime}`;

// Helper to convert hour to time slot with duration
const getTimeSlotFromHour = (hour: number, duration: number): { startTime: string; endTime: string } => {
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

interface TimeSlotSelectorProps {
  onSlotsChange?: (slots: TimeSlot[]) => void;
  initialSlots?: TimeSlot[];
  availableSlots?: TimeSlot[]; // If provided, only these slots can be selected (Guest Mode)
  slotDuration?: number; // Duration in minutes (default: 60)
}

export default function TimeSlotSelector({ 
  onSlotsChange, 
  initialSlots = [], 
  availableSlots, 
  slotDuration = 60,
}: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Date range controls - Initialize empty, set on mount
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Time range controls (hours)
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  // Create a lookup map for available slots to preserve original IDs
  const availableSlotsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (availableSlots) {
      availableSlots.forEach(slot => {
        const key = getCellKey(slot.date, slot.startTime, slot.endTime);
        map.set(key, slot.id);
      });
    }
    return map;
  }, [availableSlots]);

  useEffect(() => {
    // Guest Mode: Calculate date/time range from availableSlots
    if (availableSlots && availableSlots.length > 0) {
      const dates: string[] = [];
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      availableSlots.forEach(slot => {
        dates.push(slot.date);
        const startHourMinute = slot.startTime.split(':');
        const endHourMinute = slot.endTime.split(':');
        startTimes.push(parseInt(startHourMinute[0]) + parseInt(startHourMinute[1]) / 60);
        endTimes.push(parseInt(endHourMinute[0]) + parseInt(endHourMinute[1]) / 60);
      });

      const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
      const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);
      
      const minSlotHour = Math.floor(Math.min(...startTimes));
      const maxSlotHour = Math.ceil(Math.max(...endTimes));

      // Business Hours (09:00 - 18:00) + Auto-expand logic
      const displayStartHour = Math.min(minSlotHour, 9);
      const displayEndHour = Math.max(maxSlotHour, 18);

      setStartDate(minDate);
      setEndDate(maxDate);
      setStartHour(displayStartHour);
      setEndHour(displayEndHour);
    } else {
      // Organizer Mode: Default to 4 weeks from today
      const today = getTodayLocal();
      const future = addDays(today, 27); // 4 weeks by default

      setStartDate(today);
      setEndDate(future);
    }

    setIsMounted(true);
  }, [availableSlots]);

  const isSlotSelectable = useCallback((date: string, hour: number): boolean => {
    // 1. Range Check
    if (date < startDate || date > endDate) {
      return false; 
    }

    // 2. Guest Mode check
    if (availableSlots && availableSlots.length > 0) {
      const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
      return availableSlots.some(slot =>
        slot.date === date &&
        slot.startTime === startTime &&
        slot.endTime === endTime
      );
    }

    // 3. Organizer Mode
    return true;
  }, [startDate, endDate, availableSlots, slotDuration]);

  const {
    selectedCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    toggleCell,
    setCell,
    removeSlot,
    clearAllSlots,
  } = useTimeSlotDragSelection({
    initialSelectedCells: initialSlots.length > 0 ? new Set(initialSlots.map(slot => getCellKey(slot.date, slot.startTime, slot.endTime))) : new Set(),
    slotDuration,
    getCellKey,
    getTimeSlotFromHour,
    isSlotSelectable,
    onSelectedCellsChange: (cells) => {
      if (onSlotsChange) {
        const slots: TimeSlot[] = Array.from(cells).map(key => {
          const [datePart, timePart] = key.split('_');
          const [startTime, endTime] = timePart.split('-');
          const originalId = availableSlotsMap.get(key);
          
          return {
            id: originalId || key,
            date: datePart,
            startTime,
            endTime,
          };
        });
        onSlotsChange(slots);
      }
    },
    startDate,
    endDate,
  });

  const isCellSelected = (date: string, hour: number): boolean => {
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    return selectedCells.has(getCellKey(date, startTime, endTime));
  };
  
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  
  const handleHeaderClick = (date: string) => {
    const timeSlotsForDay: Array<{ startHour: number; endHour: number; label: string }> = [];
    const durationInHours = slotDuration / 60;
    let currentHour = startHour;
    while (currentHour < endHour) {
      const nextHour = Math.min(currentHour + durationInHours, endHour);
      timeSlotsForDay.push({
        startHour: currentHour,
        endHour: nextHour,
        label: '' 
      });
      currentHour = nextHour;
    }

    const selectableSlots = timeSlotsForDay.filter(slot => isSlotSelectable(date, slot.startHour));
    if (selectableSlots.length === 0) return;

    const allCellsInColumn = selectableSlots.map(slot => {
      const { startTime, endTime } = getTimeSlotFromHour(slot.startHour, slotDuration);
      return getCellKey(date, startTime, endTime);
    });
    const allSelected = allCellsInColumn.every(key => selectedCells.has(key));

    if (allSelected) {
      allCellsInColumn.forEach(key => removeSlot(key));
    } else {
      allCellsInColumn.forEach(slotKey => {
        const [dateStr, timePart] = slotKey.split('_');
        const [startTimeStr] = timePart.split('-');
        const hour = parseInt(startTimeStr.split(':')[0]);
        setCell(dateStr, hour, true);
      });
    }
  };

  const selectedSlotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    selectedCells.forEach(key => {
      const [datePart, timePart] = key.split('_');
      const [startTime, endTime] = timePart.split('-');
      if (!grouped[datePart]) {
        grouped[datePart] = [];
      }
      grouped[datePart].push({
        id: availableSlotsMap.get(key) || key,
        date: datePart,
        startTime,
        endTime,
      });
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedCells, availableSlotsMap]);

  if (!isMounted) return <div className="h-96 flex items-center justify-center text-gray-400 font-mono">Loading calendar...</div>;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink" onMouseLeave={handleMouseUp}>
      <div>
        <h3 className="text-lg sm:text-xl font-serif font-bold text-ink">
            Select Your Available Time Slots
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-mono">
            <>
            <span className="md:hidden">
                Long press & drag to select.
            </span>
            <span className="hidden md:inline">
                Click and drag to select time slots, or click date headers to select a full day.
            </span>
            </>
        </p>
      </div>

      {!availableSlots && (
        <div className="bg-paper border border-film-border p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="block text-sm font-bold text-ink mb-2 font-mono uppercase tracking-wider">Date Range</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="startDate" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">Start</label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink"
                    title="Start date"
                  />
                </div>
                <span className="text-ink font-bold text-center hidden sm:block">→</span>
                <div className="flex-1">
                  <label htmlFor="endDate" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">End</label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink"
                    title="End date"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="block text-sm font-bold text-ink mb-2 font-mono uppercase tracking-wider">Time Range</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="startHour" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">Start Time</label>
                  <select
                    id="startHour"
                    name="startHour"
                    value={startHour}
                    onChange={(e) => setStartHour(parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink cursor-pointer"
                    title="Start hour"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{formatHour(i)}</option>
                    ))}
                  </select>
                </div>
                <span className="text-ink font-bold text-center hidden sm:block">→</span>
                <div className="flex-1">
                  <label htmlFor="endHour" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">End Time</label>
                  <select
                    id="endHour"
                    name="endHour"
                    value={endHour}
                    onChange={(e) => setEndHour(parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink cursor-pointer"
                    title="End hour"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{formatHour(i)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TimeSlotBottomPanel
          selectedCells={selectedCells}
          selectedSlotsByDate={selectedSlotsByDate}
          onRemoveSlot={removeSlot}
          onClearAll={() => {
          setSelectedCells(new Set());
          setShowBottomPanel(false);
          }}
          showBottomPanel={showBottomPanel}
          onTogglePanel={() => setShowBottomPanel(!showBottomPanel)}
      />
      
      <TimeGrid
        startDate={startDate}
        endDate={endDate}
        startHour={startHour}
        endHour={endHour}
        slotDuration={slotDuration}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        renderCell={(date, hour, slotLabel, key, onMouseDownGrid, onMouseEnterGrid, onMouseUpGrid) => (
          <TimeSlotCell
            key={key}
            date={date}
            hour={hour}
            slotLabel={slotLabel}
            mode="select"
            isSelected={isCellSelected(date, hour)}
            isSelectable={isSlotSelectable(date, hour)}
            onMouseDown={onMouseDownGrid}
            onMouseEnter={onMouseEnterGrid}
            onMouseUp={onMouseUpGrid}
          />
        )}
        renderDateHeader={(date, defaultHeader) => (
            <button
                type="button"
                className="w-full h-full px-4 hover:bg-film-light focus:bg-film-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-film-accent transition-colors"
                onClick={() => handleHeaderClick(date)}
                aria-label={`Toggle selection for ${date}`}
            >
                {defaultHeader}
            </button>
        )}
      />

      <div className="text-xs text-gray-500 font-mono">
          <p>💡 TIP: CLICK AND DRAG TO SELECT MULTIPLE SLOTS.</p>
      </div>
    </div>
  );
}