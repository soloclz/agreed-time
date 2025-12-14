import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { ApiTimeRange, TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import TimeSlotCell from './TimeSlotCell';
import TimeGrid from './TimeGrid';
import {
  getTodayLocal,
  addDays,
  diffInDays,
  formatHour,
} from '../utils/dateUtils';
import {
  getCellKey,
  rangesToCells,
  cellsToRanges
} from '../utils/eventUtils';
import { useTimeSlotDragSelection } from '../hooks/useTimeSlotDragSelection';

// Helper to convert hour to time slot with duration for display logic
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
  onRangesChange?: (ranges: ApiTimeRange[]) => void; // Changed from onSlotsChange
  initialRanges?: ApiTimeRange[]; // Changed from initialSlots
  availableRanges?: ApiTimeRange[]; // Changed from availableSlots (Guest Mode)
  slotDuration?: number; // Duration in minutes (default: 60)
}

const DEFAULT_RANGES: ApiTimeRange[] = [];

export default function TimeSlotSelector({ 
  onRangesChange, 
  initialRanges = DEFAULT_RANGES, 
  availableRanges, 
  slotDuration = 60,
}: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Date range controls
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Time range controls (hours)
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  // Determine if it's Guest Mode
  const isGuestMode = availableRanges !== undefined;
  // Based on feedback, only highlight weekends in Organizer mode
  const highlightWeekends = !isGuestMode;

  // Convert initial ranges to selected cells set
  const initialSelectedCells = useMemo(() => {
    return rangesToCells(initialRanges, slotDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialRanges), slotDuration]); // Stabilize dependency by content
  
  // Available cells set for fast lookup in Guest Mode
  const availableCells = useMemo(() => {
    if (!availableRanges) return null;
    return rangesToCells(availableRanges, slotDuration);
  }, [availableRanges, slotDuration]);

  useEffect(() => {
    // Guest Mode: Calculate date/time range from availableRanges
    if (isGuestMode && availableRanges && availableRanges.length > 0) {
      const dates: string[] = [];
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      availableRanges.forEach(range => {
        const start = new Date(range.start_at);
        const end = new Date(range.end_at);
        
        // Local Date
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        
        // Local Hours
        startTimes.push(start.getHours() + start.getMinutes() / 60);
        endTimes.push(end.getHours() + end.getMinutes() / 60);
      });

      // Find min/max date string (lexicographically works for ISO dates)
      dates.sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
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
      const future = addDays(today, 27); // 4 weeks

      setStartDate(today);
      setEndDate(future);
    }

    setIsMounted(true);
  }, [isGuestMode, availableRanges]);

  const isSlotSelectable = useCallback((date: string, hour: number): boolean => {
    // 1. Range Check
    if (date < startDate || date > endDate) {
      return false; 
    }

    // 2. Guest Mode check
    if (availableCells) {
      const key = getCellKey(date, hour);
      return availableCells.has(key);
    }

    // 3. Organizer Mode
    return true;
  }, [startDate, endDate, availableCells]);

  const {
    selectedCells,
    setSelectedCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    toggleCell: _toggleCell,
    setCell,
    removeSlot,
    clearAllSlots: _clearAllSlots,
  } = useTimeSlotDragSelection({
    initialSelectedCells,
    slotDuration,
    getCellKey,
    isSlotSelectable,
    onSelectedCellsChange: (cells) => {
      if (onRangesChange) {
        const ranges = cellsToRanges(cells, slotDuration);
        onRangesChange(ranges);
      }
    },
    startDate,
    endDate,
  });

  const isCellSelected = (date: string, hour: number): boolean => {
    return selectedCells.has(getCellKey(date, hour));
  };
  
  const [showBottomPanel, setShowBottomPanel] = useState(false);

  // State to hold the scrollable grid element (instead of Ref, to trigger updates)
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
  
  const handleHeaderClick = (date: string) => {
    const timeSlotsForDay: Array<{ startHour: number; label: string }> = [];
    const durationInHours = slotDuration / 60;
    let currentHour = startHour;
    while (currentHour < endHour) {
      timeSlotsForDay.push({
        startHour: currentHour,
        label: '' 
      });
      currentHour += durationInHours;
    }

    const selectableSlots = timeSlotsForDay.filter(slot => isSlotSelectable(date, slot.startHour));
    if (selectableSlots.length === 0) return;

    const allCellsInColumn = selectableSlots.map(slot => {
      return getCellKey(date, slot.startHour);
    });
    const allSelected = allCellsInColumn.every(key => selectedCells.has(key));

    if (allSelected) {
      allCellsInColumn.forEach(key => removeSlot(key));
    } else {
      allCellsInColumn.forEach(slotKey => {
        const [dateStr, hourStr] = slotKey.split('_');
        setCell(dateStr, parseFloat(hourStr), true);
      });
    }
  };

  // Logic to copy first week's pattern to subsequent weeks
  const copyFirstWeekPattern = () => {
    if (!startDate || !endDate) return;

    // 1. Extract pattern from the first 7 days (Day 0 to Day 6)
    // Pattern: Map<dayIndex (0-6), Set<hour>>
    const pattern = new Map<number, Set<number>>();
    let hasPattern = false;

    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      // Skip if date exceeds endDate (unlikely for first week but safe check)
      if (date > endDate) break;

      const dayPattern = new Set<number>();
      
      // Check all possible hours in the current view
      const durationInHours = slotDuration / 60;
      let currentHour = startHour;
      while (currentHour < endHour) {
        if (selectedCells.has(getCellKey(date, currentHour))) {
          dayPattern.add(currentHour);
          hasPattern = true;
        }
        currentHour += durationInHours;
      }
      
      if (dayPattern.size > 0) {
        pattern.set(i, dayPattern);
      }
    }

    if (!hasPattern) {
      toast.error('No slots selected in the first week to copy.');
      return;
    }

    // 2. Determine target endDate. If current range < 14 days, extend it.
    let targetEndDate = endDate;
    const currentDurationDays = diffInDays(startDate, endDate) + 1;
    if (currentDurationDays < 14) {
      // Extend to at least 28 days (4 weeks) if expanding, or just ensure > 1 week
      // Let's default to the standard 4-week view if the user asks to copy
      targetEndDate = addDays(startDate, 27);
      setEndDate(targetEndDate);
      toast('Extended date range to 4 weeks', { icon: '📅' });
    }

    // 3. Apply pattern to subsequent weeks
    const newSelectedCells = new Set(selectedCells);
    let addedCount = 0;

    // Start from Day 7
    let currentDayOffset = 7; 
    let currentDate = addDays(startDate, currentDayOffset);

    while (currentDate <= targetEndDate) {
      const patternDayIndex = currentDayOffset % 7;
      const hoursToSelect = pattern.get(patternDayIndex);

      if (hoursToSelect) {
        hoursToSelect.forEach(hour => {
          const key = getCellKey(currentDate, hour);
          if (!newSelectedCells.has(key)) {
            newSelectedCells.add(key);
            addedCount++;
          }
        });
      }

      currentDayOffset++;
      currentDate = addDays(startDate, currentDayOffset);
    }

    if (addedCount > 0) {
      setSelectedCells(newSelectedCells);
      // Trigger update callback manually since we bypassed setCell/toggleCell
      if (onRangesChange) {
        const ranges = cellsToRanges(newSelectedCells, slotDuration);
        onRangesChange(ranges);
      }
      toast.success(`Copied pattern to following weeks! (+${addedCount} slots)`);
    } else {
      toast('Pattern already applied to all weeks.', { icon: '✨' });
    }
  };

  // Convert selected cells to UI TimeSlots for BottomPanel
  const selectedSlotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    selectedCells.forEach(key => {
      const [datePart, hourStr] = key.split('_');
      const hour = parseFloat(hourStr);
      const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
      
      if (!grouped[datePart]) {
        grouped[datePart] = [];
      }
      grouped[datePart].push({
        id: key, // Use key as ID for UI
        date: datePart,
        hour,
        startTime,
        endTime,
      });
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedCells, slotDuration]);

  if (!isMounted) return <div className="h-96 flex items-center justify-center text-gray-400 font-mono">Loading calendar...</div>;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink" onMouseLeave={handleMouseUp}>
      {/* Header and Controls (Same as before) */}
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

      {!availableRanges && (
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

      {/* Smart Actions Toolbar (Organizer Mode Only) */}
      {highlightWeekends && ( // Only show in Organizer Mode
        <div className="flex justify-end">
          <button
            type="button"
            onClick={copyFirstWeekPattern}
            className="flex items-center gap-2 px-4 py-2 bg-paper border border-film-border hover:bg-film-light hover:border-film-accent/50 text-ink text-sm font-mono font-bold transition-all shadow-sm active:translate-y-0.5 rounded-sm group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">✨</span>
            COPY WEEK 1 TO ALL
          </button>
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
        highlightWeekends={highlightWeekends} // Pass the prop
        onGridMount={setGridElement} // Pass the setter
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        renderCell={(date, hour, slotLabel, key) => (
          <TimeSlotCell
            key={key}
            date={date}
            hour={hour}
            slotLabel={slotLabel}
            mode="select"
            isSelected={isCellSelected(date, hour)}
            isSelectable={isSlotSelectable(date, hour)}
            highlightWeekends={highlightWeekends} // Pass the prop
            gridScrollElement={gridElement} // Pass the element state
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