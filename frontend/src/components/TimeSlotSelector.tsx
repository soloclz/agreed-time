import { useState, useMemo, useEffect, useRef } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import {
  getTodayLocal,
  addDays,
  parseLocalDate,
  formatLocalDate,
  getFirstSunday,
  getLastSaturday,
  diffInDays,
  formatDateDisplay,
  formatHour,
  formatHourTime,
} from '../utils/dateUtils';

interface TimeSlotSelectorProps {
  onSlotsChange?: (slots: TimeSlot[]) => void;
  initialSlots?: TimeSlot[];
}

interface Week {
  weekNumber: number;
  startDate: Date;
  dates: string[];
}

const MAX_WEEKS = 8;

export default function TimeSlotSelector({ onSlotsChange, initialSlots = [] }: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Date range controls - Initialize empty, set on mount
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const today = getTodayLocal();
    const future = addDays(today, 27); // 4 weeks by default

    setStartDate(today);
    setEndDate(future);
    setIsMounted(true);
  }, []);

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

  // Hours array
  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

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
        const hour = parseInt(slot.startTime.split(':')[0]);
        keys.add(getCellKey(slot.date, hour));
      });
      setSelectedCells(keys);
    }
  }, []);

  // Notify parent
  useEffect(() => {
    if (onSlotsChangeRef.current) {
      const slots: TimeSlot[] = Array.from(selectedCells).map(key => {
        const [date, hourStr] = key.split('_');
        const hour = parseInt(hourStr);
        return {
          id: key,
          date,
          startTime: formatHourTime(hour),
          endTime: formatHourTime(hour + 1),
        };
      });
      onSlotsChangeRef.current(slots);
    }
  }, [selectedCells]);

  const getCellKey = (date: string, hour: number): string => `${date}_${hour}`;

  const isCellSelected = (date: string, hour: number): boolean => {
    return selectedCells.has(getCellKey(date, hour));
  };

  const isDateInRange = (dateStr: string): boolean => {
    return dateStr >= startDate && dateStr <= endDate;
  };

  const toggleCell = (date: string, hour: number) => {
    if (!isDateInRange(date)) return;
    const key = getCellKey(date, hour);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  const setCell = (date: string, hour: number, selected: boolean) => {
    if (!isDateInRange(date)) return;
    const key = getCellKey(date, hour);
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
    if (!isDateInRange(date)) return;

    const allCellsInColumn = hours.map(hour => getCellKey(date, hour));
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
    if (e.button !== 0) return; // Only left click
    if (!isDateInRange(date)) return;

    e.preventDefault(); // Prevent text selection
    isDragging.current = true;

    const isSelected = isCellSelected(date, hour);
    dragMode.current = isSelected ? 'deselect' : 'select';
    toggleCell(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    if (isDragging.current && isDateInRange(date)) {
      setCell(date, hour, dragMode.current === 'select');
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Native Touch Event Handlers with { passive: false }
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Helper to check selection using the ref (fresh state)
    const isCellSelectedFresh = (date: string, hour: number): boolean => {
      return selectedCellsRef.current.has(`${date}_${hour}`);
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
        const hour = parseInt(hourStr);
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
            const hour = parseInt(hourStr);
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

    const handleNativeTouchEnd = (e: TouchEvent) => {
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
  }, [startDate, endDate]);

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
      const [date, hourStr] = key.split('_');
      const hour = parseInt(hourStr);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        id: key,
        date,
        startTime: formatHourTime(hour),
        endTime: formatHourTime(hour + 1),
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
        <h3 className="text-lg sm:text-xl font-serif font-bold text-ink">Select Your Available Time Slots</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-mono">
          <span className="md:hidden">
            Long press & drag to select.
          </span>
          <span className="hidden md:inline">
            Click and drag to select time slots, or click date headers to select a full day.
          </span>
        </p>
      </div>

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
        <div
          ref={gridRef}
          className="overflow-x-auto border border-film-border bg-paper select-none"
        >
          <div className="flex">
            {weeks.map((week, weekIndex) => (
              <div
                key={week.weekNumber}
                className={`flex-shrink-0 ${weekIndex > 0 ? 'border-l border-film-border' : ''}`}
              >
                <div className="bg-paper px-4 py-3 text-sm font-serif font-bold text-ink border-b border-film-border tracking-wide">
                  WEEK {week.weekNumber + 1}: {formatWeekRange(week)}
                </div>

                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="border-r border-b border-film-border bg-paper px-3 py-2 text-xs font-mono font-bold text-ink sticky left-0 z-20">
                        TIME
                      </th>
                      {week.dates.map(date => {
                        const inRange = isDateInRange(date);
                        return (
                          <th
                            key={date}
                            className={`border-b border-r border-film-border px-4 py-3 text-xs font-serif font-bold whitespace-pre-line text-center last:border-r-0 ${inRange ? 'bg-paper text-ink cursor-pointer hover:bg-film-light focus:bg-film-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-film-accent' : 'bg-gray-100/80 text-gray-400'}`}
                            onClick={() => handleHeaderClick(date)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleHeaderClick(date);
                              }
                            }}
                            role={inRange ? "button" : undefined}
                            tabIndex={inRange ? 0 : undefined}
                            aria-label={inRange ? `Toggle selection for ${date}` : undefined}
                          >
                            {formatDateDisplay(date)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map(hour => (
                      <tr key={hour}>
                        <th className="border-r border-b border-film-border bg-paper px-3 py-2 text-xs font-mono text-ink text-right sticky left-0 z-10 last:border-b-0">
                          {formatHour(hour)}
                        </th>
                        {week.dates.map(date => {
                          const isSelected = isCellSelected(date, hour);
                          const inRange = isDateInRange(date);
                          return (
                            <td
                              key={`${date}_${hour}`}
                              role="gridcell"
                              aria-selected={isSelected}
                              data-date={date}
                              data-hour={hour}
                              style={{
                                backgroundColor: isSelected ? '#4CB5AB' : undefined
                              }}
                              className={`
                                border-r border-b border-film-border w-16 h-12 cursor-pointer transition-colors last:border-r-0
                                ${!inRange
                                  ? 'bg-gray-100/80 cursor-not-allowed pattern-diagonal-lines'
                                  : isSelected
                                  ? ''
                                  : 'bg-film-light hover:bg-white active:bg-white'
                                }
                              `}
                              onMouseDown={(e) => handleMouseDown(e, date, hour)}
                              onMouseEnter={() => handleMouseEnter(date, hour)}
                              onMouseUp={handleMouseUp}
                            />
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
      )}

      <div className="text-xs text-gray-500 font-mono">
        <p>💡 TIP: CLICK AND DRAG TO SELECT MULTIPLE SLOTS.</p>
      </div>

      {selectedCells.size > 0 && <div className="h-20" />}
    </div>
  );
}
