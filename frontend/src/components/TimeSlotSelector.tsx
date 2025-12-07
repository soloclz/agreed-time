import { useState, useMemo, useEffect, useRef } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import TimeSlotCell from './TimeSlotCell';
import TimeGrid from './TimeGrid';
import {
  getTodayLocal,
  addDays,
  formatHour,
} from '../utils/dateUtils';

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

  const handleHeaderClick = (date: string) => {
    // Recalculate timeSlots for this day, as TimeGrid now owns the main timeSlots array
    const timeSlotsForDay: Array<{ startHour: number; endHour: number; label: string }> = [];
    const durationInHours = slotDuration / 60;
    let currentHour = startHour;
    while (currentHour < endHour) {
      const nextHour = Math.min(currentHour + durationInHours, endHour);
      timeSlotsForDay.push({
        startHour: currentHour,
        endHour: nextHour,
        label: '' // Label not needed for this logic
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

    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all
        allCellsInColumn.forEach(key => newSet.delete(key));
      }
      else {
        // Select all
        allCellsInColumn.forEach(key => newSet.add(key));
      }
      return newSet;
    });
  };

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent, date: string, hour: number) => {
    if (e.button !== 0) return; // Only left click

    e.preventDefault(); // Prevent text selection
    isDragging.current = true;

    const isSelected = isCellSelected(date, hour);
    dragMode.current = isSelected ? 'deselect' : 'select';
    toggleCell(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    // `isDateInRange` check implicitly handled by `isSlotSelectable`
    if (isDragging.current) {
      setCell(date, hour, dragMode.current === 'select');
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const grid = document.querySelector('.time-grid-scroll-area'); // Target the scrollable area of TimeGrid
    if (!grid) return;

    // Helper to check selection using the ref (fresh state)
    const isCellSelectedFresh = (date: string, hour: number): boolean => {
      const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
      const key = getCellKey(date, startTime, endTime);
      return selectedCellsRef.current.has(key);
    };

    const handleNativeTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const target = touchEvent.target as HTMLElement;
      const td = target.closest('td');
      if (!td) return;

      const date = td.dataset.date;
      const hourStr = td.dataset.hour;
      if (!date || !hourStr) return;
      
      // Record start position for scroll detection
      const touch = touchEvent.touches[0];
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };

      // Clear any existing timer
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }

      // Start Long Press Timer (500ms)
      longPressTimerRef.current = window.setTimeout(() => {
        const hour = parseFloat(hourStr);

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

    const handleNativeTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.touches[0];
      
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
            const currentSelected = isCellSelectedFresh(date, hour);
            const shouldSelect = dragMode.current === 'select';

            if (currentSelected !== shouldSelect) {
              setCell(date, hour, shouldSelect);
            }
          }
        }
      }
    };

    const handleNativeTouchEnd = (_e: Event) => {
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
  }, [startDate, endDate]); // `mode` removed from dependencies // removed `mode` from dependencies





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
