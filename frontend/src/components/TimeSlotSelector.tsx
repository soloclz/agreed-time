import { useState, useMemo, useEffect, useRef } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';

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
  // Date range controls
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const future = new Date();
    future.setDate(future.getDate() + 27); // 4 weeks by default
    return future.toISOString().split('T')[0];
  });

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

  useEffect(() => {
    onSlotsChangeRef.current = onSlotsChange;
  }, [onSlotsChange]);

  // Keep selectedCellsRef up to date
  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);

  // Generate weeks based on date range (UTC consistent)
  const weeks = useMemo((): Week[] => {
    const createUTC = (d: string) => new Date(d + 'T00:00:00Z');
    const startObj = createUTC(startDate);
    const endObj = createUTC(endDate);

    const firstSunday = new Date(startObj);
    firstSunday.setUTCDate(startObj.getUTCDate() - startObj.getUTCDay());

    const lastSaturday = new Date(endObj);
    lastSaturday.setUTCDate(endObj.getUTCDate() + (6 - endObj.getUTCDay()));

    const weeksArray: Week[] = [];
    let current = new Date(firstSunday);
    let weekNum = 0;

    while (current <= lastSaturday && weekNum < MAX_WEEKS) {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(current);
        date.setUTCDate(current.getUTCDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }
      weeksArray.push({
        weekNumber: weekNum,
        startDate: new Date(current),
        dates: weekDates,
      });
      current.setUTCDate(current.getUTCDate() + 7);
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 'End date cannot be before start date';
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const diffWeeks = Math.ceil(diffDays / 7);
    
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
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
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

      const hour = parseInt(hourStr);
      if (!isDateInRange(date)) return;

      // Prevent scrolling
      if (e.cancelable) e.preventDefault();

      isDragging.current = true;
      const isSelected = isCellSelectedFresh(date, hour);
      dragMode.current = isSelected ? 'deselect' : 'select';
      toggleCell(date, hour);
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;

      // Prevent scrolling
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);

      if (element instanceof HTMLElement) {
        const td = element.closest('td');
        if (td) {
          const date = td.dataset.date;
          const hourStr = td.dataset.hour;

          if (date && hourStr) {
            const hour = parseInt(hourStr);
            if (isDateInRange(date)) {
              // Only update if the state needs changing (optimization)
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
      isDragging.current = false;
      if (e.cancelable) e.preventDefault();
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
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    const month = date.getMonth() + 1;
    const dateNum = date.getDate();
    return `${day}\n${month}/${dateNum}`;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const formatWeekRange = (week: Week): string => {
    const start = new Date(week.dates[0] + 'T00:00:00');
    const end = new Date(week.dates[6] + 'T00:00:00');
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
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      });
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedCells]);

  return (
    <div className="space-y-6 font-sans text-ink" onMouseLeave={handleMouseUp}>
      <div>
        <h3 className="text-xl font-serif font-bold text-ink">Select Your Available Time Slots</h3>
        <p className="text-sm text-gray-600 mt-1 font-mono">
          Click and drag to select time slots
        </p>
      </div>

      <div className="bg-paper border border-film-border p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="block text-sm font-bold text-ink mb-2 font-mono uppercase tracking-wider">Date Range</div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label htmlFor="startDate" className="sr-only">Start Date</label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border-b border-film-border rounded-t-sm bg-film-light/50 text-sm focus:outline-none focus:border-film-accent font-mono transition-colors text-ink"
                  title="Start date"
                />
              </div>
              <span className="text-ink font-bold">→</span>
              <div className="flex-1">
                <label htmlFor="endDate" className="sr-only">End Date</label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border-b border-film-border rounded-t-sm bg-film-light/50 text-sm focus:outline-none focus:border-film-accent font-mono transition-colors text-ink"
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
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label htmlFor="startHour" className="sr-only">Start Hour</label>
                <select
                  id="startHour"
                  name="startHour"
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-b border-film-border rounded-t-sm bg-film-light/50 text-sm focus:outline-none focus:border-film-accent font-mono transition-colors text-ink"
                  title="Start hour"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{formatHour(i)}</option>
                  ))}
                </select>
              </div>
              <span className="text-ink font-bold">→</span>
              <div className="flex-1">
                <label htmlFor="endHour" className="sr-only">End Hour</label>
                <select
                  id="endHour"
                  name="endHour"
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-b border-film-border rounded-t-sm bg-film-light/50 text-sm focus:outline-none focus:border-film-accent font-mono transition-colors text-ink"
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
        <div className="flex items-center justify-between font-mono text-sm">
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: -800, behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 border border-film-border bg-paper hover:bg-film-light flex items-center gap-2 transition-colors active:translate-y-0.5"
          >
            ← PREV
          </button>
          <span className="text-ink font-bold">
            {weeks.length} {weeks.length === 1 ? 'WEEK' : 'WEEKS'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: 800, behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 border border-film-border bg-paper hover:bg-film-light flex items-center gap-2 transition-colors active:translate-y-0.5"
          >
            NEXT →
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
                            className={`border-b border-r border-film-border px-4 py-3 text-xs font-serif font-bold whitespace-pre-line text-center last:border-r-0 ${inRange ? 'bg-paper text-ink' : 'bg-gray-100/80 text-gray-400'}`}
                          >
                            {formatDate(date)}
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