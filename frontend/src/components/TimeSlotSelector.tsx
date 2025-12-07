import { useState, useMemo, useEffect, useRef } from 'react';
import type { TimeSlot, HeatmapCellData } from '../types'; // Import HeatmapCellData
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import {
  getTodayLocal,
  addDays,
  parseLocalDate,
  getFirstSunday,
  getLastSaturday,
  diffInDays,
  formatDateDisplay,
  formatHour,
} from '../utils/dateUtils';

interface TimeSlotSelectorProps {
  onSlotsChange?: (slots: TimeSlot[]) => void;
  initialSlots?: TimeSlot[];
  availableSlots?: TimeSlot[]; // If provided, only these slots can be selected (Guest Mode)
  slotDuration?: number; // Duration in minutes (default: 60)
  mode?: 'select' | 'heatmap'; // New: Mode for selector (select or heatmap)
  heatmapData?: Record<string, HeatmapCellData>; // New: Data for heatmap display
  totalParticipants?: number; // New: Total number of participants for heatmap intensity calculation
}

interface Week {
  weekNumber: number;
  startDate: Date;
  dates: string[];
}

const MAX_WEEKS = 8;

export default function TimeSlotSelector({ 
  onSlotsChange, 
  initialSlots = [], 
  availableSlots, 
  slotDuration = 60,
  mode = 'select',
  heatmapData = {},
  totalParticipants = 0
}: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Date range controls - Initialize empty, set on mount
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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
      const minHour = Math.floor(Math.min(...startTimes));
      const maxHour = Math.ceil(Math.max(...endTimes));

      setStartDate(minDate);
      setEndDate(maxDate);
      setStartHour(minHour);
      setEndHour(maxHour);
    } else {
      // Organizer Mode: Default to 4 weeks from today
      const today = getTodayLocal();
      const future = addDays(today, 27); // 4 weeks by default

      setStartDate(today);
      setEndDate(future);
    }

    setIsMounted(true);
  }, [availableSlots]);

  // Time range controls (hours)
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  // Grid state
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [showBottomPanel, setShowBottomPanel] = useState(false);

  // Interaction state
  const isDragging = useRef(false);
  const dragMode = useRef<'select' | 'deselect'>('select');
  const gridRef = useRef<HTMLDivElement>(null);
  const onSlotsChangeRef = useRef(onSlotsChange);
  const selectedCellsRef = useRef<Set<string>>(new Set());
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    onSlotsChangeRef.current = onSlotsChange;
  }, [onSlotsChange]);

  // Keep selectedCellsRef up to date
  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);

  // Generate weeks based on date range (timezone-safe)
  const weeks = useMemo((): Week[] => {
    if (!startDate || !endDate) return [];

    const firstSundayStr = getFirstSunday(startDate);
    const lastSaturdayStr = getLastSaturday(endDate);

    const weeksArray: Week[] = [];
    let currentDateStr = firstSundayStr;
    let weekNum = 0;

    while (currentDateStr <= lastSaturdayStr && weekNum < MAX_WEEKS) {
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
  }, [startDate, endDate]);


  // Generate time slots based on slotDuration
  const timeSlots = useMemo(() => {
    const result: Array<{ startHour: number; endHour: number; label: string }> = [];
    const durationInHours = slotDuration / 60;

    let currentHour = startHour;
    while (currentHour < endHour) {
      const nextHour = Math.min(currentHour + durationInHours, endHour);

      // Generate label
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

    if (diffWeeks > MAX_WEEKS) return `Date range cannot exceed ${MAX_WEEKS} weeks`;
    return null;
  }, [startDate, endDate]);

  // Initialize
  useEffect(() => {
    if (initialSlots.length > 0) {
      const keys = new Set<string>();
      initialSlots.forEach(slot => {
        keys.add(getCellKey(slot.date, slot.startTime, slot.endTime));
      });
      setSelectedCells(keys);
    }
  }, []);

  // Notify parent
  useEffect(() => {
    if (onSlotsChangeRef.current) {
      const slots: TimeSlot[] = Array.from(selectedCells).map(key => {
        const [datePart, timePart] = key.split('_');
        const [startTime, endTime] = timePart.split('-');
        return {
          id: key,
          date: datePart,
          startTime,
          endTime,
        };
      });
      onSlotsChangeRef.current(slots);
    }
  }, [selectedCells]);

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

  const isSlotSelectable = (date: string, hour: number): boolean => {
    // Read-only in heatmap mode
    if (mode === 'heatmap') return false;

    // 1. Basic range check
    if (!isDateInRange(date)) return false;

    // 2. Guest Mode check: If availableSlots is provided, slot MUST be in it
    if (availableSlots && availableSlots.length > 0) {
      const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
      return availableSlots.some(slot =>
        slot.date === date &&
        slot.startTime === startTime &&
        slot.endTime === endTime
      );
    }

    // 3. Organizer Mode: All range-valid slots are selectable
    return true;
  };

  const isCellSelected = (date: string, hour: number): boolean => {
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    return selectedCells.has(getCellKey(date, startTime, endTime));
  };

  const isDateInRange = (dateStr: string): boolean => {
    return dateStr >= startDate && dateStr <= endDate;
  };

  const toggleCell = (date: string, hour: number) => {
    if (!isSlotSelectable(date, hour)) return;
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    const key = getCellKey(date, startTime, endTime);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  const setCell = (date: string, hour: number, selected: boolean) => {
    if (!isSlotSelectable(date, hour)) return;
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    const key = getCellKey(date, startTime, endTime);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (selected) newSet.add(key);
      else newSet.delete(key);
      return newSet;
    });
  };

  const removeSlot = (key: string) => {
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  // Header Click Handler (Select/Deselect Day)
  const handleHeaderClick = (date: string) => {
    if (mode === 'heatmap') return;
    if (!isDateInRange(date)) return;

    // Filter slots that are actually selectable
    const selectableSlots = timeSlots.filter(slot => isSlotSelectable(date, slot.startHour));
    if (selectableSlots.length === 0) return;

    const allCellsInColumn = selectableSlots.map(slot => {
      const { startTime, endTime } = getTimeSlotFromHour(slot.startHour, slotDuration);
      return getCellKey(date, startTime, endTime);
    });
    const allSelected = allCellsInColumn.every(key => selectedCells.has(key));

    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all
        allCellsInColumn.forEach(key => newSet.delete(key));
      } else {
        // Select all
        allCellsInColumn.forEach(key => newSet.add(key));
      }
      return newSet;
    });
  };

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent, date: string, hour: number) => {
    if (mode === 'heatmap') return;
    if (e.button !== 0) return; // Only left click
    if (!isDateInRange(date)) return;

    e.preventDefault(); // Prevent text selection
    isDragging.current = true;

    const isSelected = isCellSelected(date, hour);
    dragMode.current = isSelected ? 'deselect' : 'select';
    toggleCell(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    if (mode === 'heatmap') return;
    if (isDragging.current && isDateInRange(date)) {
      setCell(date, hour, dragMode.current === 'select');
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Native Touch Event Handlers with { passive: false }
  useEffect(() => {
    if (mode === 'heatmap') return;

    const grid = gridRef.current;
    if (!grid) return;

    // Helper to check selection using the ref (fresh state)
    const isCellSelectedFresh = (date: string, hour: number): boolean => {
      const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
      const key = getCellKey(date, startTime, endTime);
      return selectedCellsRef.current.has(key);
    };

    const handleNativeTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const td = target.closest('td');
      if (!td) return;

      const date = td.dataset.date;
      const hourStr = td.dataset.hour;
      if (!date || !hourStr) return;
      
      // Record start position for scroll detection
      const touch = e.touches[0];
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };

      // Clear any existing timer
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }

      // Start Long Press Timer (500ms)
      longPressTimerRef.current = window.setTimeout(() => {
        const hour = parseFloat(hourStr);
        if (!isDateInRange(date)) return;

        // Long press confirmed: Enter drag mode
        isDragging.current = true;
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        const isSelected = isCellSelectedFresh(date, hour);
        dragMode.current = isSelected ? 'deselect' : 'select';
        toggleCell(date, hour);
      }, 500);
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      
      // Check if user is scrolling (moved significantly before long press fired)
      if (touchStartPositionRef.current && !isDragging.current) {
        const moveX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
        const moveY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
        
        // If moved more than 10px, it's a scroll, cancel long press
        if (moveX > 10 || moveY > 10) {
          if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = undefined;
          }
        }
        return; // Let native scroll happen
      }

      // If not in drag mode, do nothing (allow scroll)
      if (!isDragging.current) return;

      // In Drag Mode: Prevent scrolling and handle selection
      if (e.cancelable) e.preventDefault();

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element instanceof HTMLElement) {
        const td = element.closest('td');
        if (td) {
          const date = td.dataset.date;
          const hourStr = td.dataset.hour;

          if (date && hourStr) {
            const hour = parseFloat(hourStr);
            if (isDateInRange(date)) {
              const currentSelected = isCellSelectedFresh(date, hour);
              const shouldSelect = dragMode.current === 'select';

              if (currentSelected !== shouldSelect) {
                setCell(date, hour, shouldSelect);
              }
            }
          }
        }
      }
    };

    const handleNativeTouchEnd = () => {
      // Cancel timer if finger lifted early (tap)
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
      
      isDragging.current = false;
      touchStartPositionRef.current = null;
    };

    // Attach listeners with passive: false to allow preventDefault
    grid.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    grid.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    grid.addEventListener('touchend', handleNativeTouchEnd, { passive: false });

    return () => {
      grid.removeEventListener('touchstart', handleNativeTouchStart);
      grid.removeEventListener('touchmove', handleNativeTouchMove);
      grid.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [startDate, endDate, mode]);

  // Global mouse up listener
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Format helpers
  const formatWeekRange = (week: Week): string => {
    const start = parseLocalDate(week.dates[0]);
    const end = parseLocalDate(week.dates[6]);
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  // Group selected slots
  const selectedSlotsByDate = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    selectedCells.forEach(key => {
      const [datePart, timePart] = key.split('_');
      const [startTime, endTime] = timePart.split('-');
      if (!grouped[datePart]) {
        grouped[datePart] = [];
      }
      grouped[datePart].push({
        id: key,
        date: datePart,
        startTime,
        endTime,
      });
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedCells]);

  if (!isMounted) return <div className="h-96 flex items-center justify-center text-gray-400 font-mono">Loading calendar...</div>;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink" onMouseLeave={handleMouseUp}>
      <div>
        <h3 className="text-lg sm:text-xl font-serif font-bold text-ink">
            {mode === 'heatmap' ? 'Availability Heatmap' : 'Select Your Available Time Slots'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-mono">
            {mode === 'heatmap' ? (
                'Darker red indicates more people are available.'
            ) : (
                <>
                <span className="md:hidden">
                    Long press & drag to select.
                </span>
                <span className="hidden md:inline">
                    Click and drag to select time slots, or click date headers to select a full day.
                </span>
                </>
            )}
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
              {dateRangeError && (
                <p className="text-xs text-red-600 mt-2 font-mono font-bold">{dateRangeError}</p>
              )}
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

      {mode === 'select' && (
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
      )}

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

      {!dateRangeError && (
        <div className="flex border border-film-border bg-paper relative overflow-hidden rounded-sm">
          {/* Left: Fixed Time Column */}
          <div className="flex-shrink-0 z-30 bg-paper border-r border-film-border shadow-sm">
            {/* Placeholder for Week Title alignment */}
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
                          return (
                            <th
                              key={date}
                              className={`border-b border-r border-film-border p-0 text-xs font-serif font-bold whitespace-pre-line text-center h-12 box-border last:border-r-0 ${inRange ? 'bg-paper text-ink' : 'bg-gray-100/80 text-gray-400'}`}
                            >
                              {inRange ? (
                                <button
                                  type="button"
                                  className="w-full h-full px-4 hover:bg-film-light focus:bg-film-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-film-accent transition-colors"
                                  onClick={() => handleHeaderClick(date)}
                                  aria-label={`Toggle selection for ${date}`}
                                >
                                  {formatDateDisplay(date)}
                                </button>
                              ) : (
                                <div className="w-full h-full px-4 flex items-center justify-center">
                                  {formatDateDisplay(date)}
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, slotIndex) => (
                        <tr key={slotIndex}>
                          {week.dates.map(date => {
                            const { startTime, endTime } = getTimeSlotFromHour(slot.startHour, slotDuration);
                            const key = getCellKey(date, startTime, endTime);
                            
                            // Selection Mode Logic
                            const isSelected = isCellSelected(date, slot.startHour);
                            const selectable = isSlotSelectable(date, slot.startHour);

                            // Heatmap Mode Logic
                            const cellData = heatmapData ? heatmapData[key] : undefined;
                            const count = cellData?.count || 0;
                            
                            // Calculate opacity with a non-linear scale for smoother perception
                            // 1. Get raw ratio (0 to 1)
                            const rawRatio = totalParticipants > 0 ? count / totalParticipants : 0;
                            
                            // 2. Apply power curve (power < 1 boosts lower values, making differences more visible)
                            //    e.g. 0.2^0.6 ≈ 0.38, 0.5^0.6 ≈ 0.66, 0.8^0.6 ≈ 0.87
                            const scaledOpacity = Math.pow(rawRatio, 0.6);

                            // 3. Ensure minimum visibility for any non-zero count (e.g. 0.15)
                            //    and cap at 1.0
                            const finalOpacity = count > 0 
                                ? Math.min(1, Math.max(0.15, scaledOpacity)) 
                                : 0;
                                
                            const hasVotes = count > 0;

                            return (
                              <td
                                key={`${date}_${slotIndex}`}
                                role="gridcell"
                                aria-selected={isSelected}
                                aria-disabled={!selectable}
                                data-date={date}
                                data-hour={slot.startHour}
                                className={`
                                  relative group
                                  border-r border-b border-film-border w-16 h-12 box-border last:border-r-0 align-middle
                                  ${mode === 'select' ? (
                                    isSelected ? 'bg-film-accent' : 
                                    !selectable ? 'bg-gray-100/50 cursor-not-allowed pattern-diagonal-lines opacity-50' : 
                                    'cursor-pointer transition-colors bg-film-light hover:bg-white active:bg-white'
                                  ) : (
                                     // Heatmap mode base style
                                     'transition-colors'
                                  )}
                                `}
                                style={mode === 'heatmap' ? {
                                    backgroundColor: hasVotes ? `rgba(225, 29, 72, ${finalOpacity})` : 'transparent'
                                } : undefined}
                                onMouseDown={(e) => selectable && handleMouseDown(e, date, slot.startHour)}
                                onMouseEnter={() => selectable && handleMouseEnter(date, slot.startHour)}
                                onMouseUp={handleMouseUp}
                              >
                                {mode === 'heatmap' && hasVotes && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className={`text-xs font-bold ${finalOpacity > 0.6 ? 'text-white' : 'text-film-accent'}`}>
                                                {count}
                                            </span>
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-[200px] bg-ink text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
                                            <div className="font-bold mb-1">{date} @ {slot.label}</div>
                                            <div className="text-white/80 whitespace-normal">
                                                {cellData?.attendees.join(', ')}
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-ink"></div>
                                        </div>
                                    </>
                                )}
                              </td>
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

      {mode === 'select' && (
        <div className="text-xs text-gray-500 font-mono">
            <p>💡 TIP: CLICK AND DRAG TO SELECT MULTIPLE SLOTS.</p>
        </div>
      )}
       
       {mode === 'heatmap' && (
        <div className="mt-6 flex items-center justify-end gap-4 text-sm text-ink/60">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,0.40)]"></div> {/* Approx opacity for 25% participation */}
                <span>Few</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,0.83)]"></div> {/* Approx opacity for 75% participation */}
                <span>Most</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,1.0)]"></div> {/* Full opacity for 100% participation */}
                <span>All ({totalParticipants})</span>
            </div>
        </div>
       )}
    </div>
  );
}
