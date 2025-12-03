import { useState, useRef, useEffect, useMemo } from 'react';
import type { TimeSlot } from '../types';

interface TimeSlotSelectorProps {
  onSlotsChange?: (slots: TimeSlot[]) => void;
  initialSlots?: TimeSlot[];
}

interface Week {
  weekNumber: number;
  startDate: Date;
  dates: string[];
}

const MAX_WEEKS = 8; // 最多 8 週

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // UI state
  const [showBottomPanel, setShowBottomPanel] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const onSlotsChangeRef = useRef(onSlotsChange);

  // Keep the ref up to date
  useEffect(() => {
    onSlotsChangeRef.current = onSlotsChange;
  }, [onSlotsChange]);

  // Generate weeks based on date range (Sunday as start)
  const weeks = useMemo((): Week[] => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    // Find the Sunday before or on start date
    const firstSunday = new Date(start);
    firstSunday.setDate(start.getDate() - start.getDay());

    // Find the Saturday after or on end date
    const lastSaturday = new Date(end);
    lastSaturday.setDate(end.getDate() + (6 - end.getDay()));

    const weeksArray: Week[] = [];
    let current = new Date(firstSunday);
    let weekNum = 0;

    while (current <= lastSaturday && weekNum < MAX_WEEKS) {
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(current);
        date.setDate(current.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      weeksArray.push({
        weekNumber: weekNum,
        startDate: new Date(current),
        dates: weekDates,
      });

      current.setDate(current.getDate() + 7);
      weekNum++;
    }

    return weeksArray;
  }, [startDate, endDate]);

  // Hours array based on time range
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

    if (end < start) {
      return '結束日期不能早於開始日期';
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const diffWeeks = Math.ceil(diffDays / 7);

    if (diffWeeks > MAX_WEEKS) {
      return `日期範圍不能超過 ${MAX_WEEKS} 週`;
    }

    return null;
  }, [startDate, endDate]);

  // Initialize from initialSlots
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

  // Notify parent when selected cells change
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

  // Check if date is within selected range
  const isDateInRange = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const toggleCell = (date: string, hour: number) => {
    if (!isDateInRange(date)) return;

    const key = getCellKey(date, hour);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const setCell = (date: string, hour: number, selected: boolean) => {
    if (!isDateInRange(date)) return;

    const key = getCellKey(date, hour);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
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

  const handleMouseDown = (date: string, hour: number) => {
    if (!isDateInRange(date)) return;

    const isSelected = isCellSelected(date, hour);
    setDragMode(isSelected ? 'deselect' : 'select');
    setIsDragging(true);
    toggleCell(date, hour);
  };

  const handleMouseEnter = (date: string, hour: number) => {
    if (isDragging && isDateInRange(date)) {
      setCell(date, hour, dragMode === 'select');
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Format date for display
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

  // Group selected slots by date
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
    // Sort slots within each date
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedCells]);

  const selectedDates = Object.keys(selectedSlotsByDate).sort();
  const selectedCount = selectedCells.size;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Select Your Available Time Slots</h3>
        <p className="text-sm text-gray-600 mt-1">
          Click and drag to select time slots
        </p>
      </div>

      {/* Date & Time Range Controls */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">to</span>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {dateRangeError && (
              <p className="text-xs text-red-600 mt-1">{dateRangeError}</p>
            )}
          </div>

          {/* Time Range */}
          <div>
            <label htmlFor="startHour" className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <div className="flex items-center gap-2">
              <select
                id="startHour"
                name="startHour"
                value={startHour}
                onChange={(e) => setStartHour(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
              <span className="text-gray-500">to</span>
              <select
                id="endHour"
                name="endHour"
                value={endHour}
                onChange={(e) => setEndHour(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel Overlay */}
      {showBottomPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setShowBottomPanel(false)}
        />
      )}

      {/* Bottom Fixed Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {/* Expanded Panel */}
          <div
            className={`bg-white border-t-2 border-green-600 shadow-2xl transition-all duration-300 ease-in-out ${
              showBottomPanel ? 'max-h-[60vh]' : 'max-h-0'
            } overflow-hidden`}
          >
            {/* Panel Header */}
            <div className="bg-green-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Selected Time Slots</h3>
                <p className="text-xs text-gray-600">{selectedCount} slots selected</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCells(new Set());
                  setShowBottomPanel(false);
                }}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Panel Content */}
            <div className="overflow-y-auto p-4 space-y-3 max-h-[calc(60vh-60px)]">
              {selectedDates.map(date => (
                <div key={date} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                    <span className="text-sm">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedSlotsByDate[date].length} slots
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSlotsByDate[date].map(slot => (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => removeSlot(slot.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-800 rounded text-xs hover:bg-red-100 hover:text-red-800 transition-colors"
                        title="Click to remove"
                      >
                        {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
                        <span className="text-red-600">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar - Always Visible */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBottomPanel(!showBottomPanel);
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-4 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 bg-white text-green-600 rounded-full text-sm font-bold">
                {selectedCount}
              </span>
              <span className="font-semibold">Selected Time Slots</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-100">
                {showBottomPanel ? 'Hide Details' : 'View Details'}
              </span>
              <span className={`transition-transform duration-300 ${showBottomPanel ? 'rotate-180' : ''}`}>
                ▲
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      {weeks.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: -800, behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-1"
          >
            ← Scroll Left
          </button>
          <span className="text-sm text-gray-600">
            {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'} • Scroll horizontally to see more
          </span>
          <button
            type="button"
            onClick={() => {
              if (gridRef.current) {
                gridRef.current.scrollBy({ left: 800, behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-1"
          >
            Scroll Right →
          </button>
        </div>
      )}

      {/* Grid - Horizontal Scrolling */}
      {!dateRangeError && (
        <div
          ref={gridRef}
          className="overflow-x-auto border border-gray-300 rounded-lg select-none"
        >
          <div className="flex">
            {weeks.map((week, weekIndex) => (
              <div
                key={week.weekNumber}
                className={`flex-shrink-0 ${weekIndex > 0 ? 'border-l-4 border-gray-400' : ''}`}
              >
                {/* Week Header */}
                <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-300">
                  Week {week.weekNumber + 1}: {formatWeekRange(week)}
                </div>

                {/* Week Grid */}
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 sticky left-0 z-20">
                        Time
                      </th>
                      {week.dates.map(date => {
                        const inRange = isDateInRange(date);
                        return (
                          <th
                            key={date}
                            className={`border border-gray-300 px-4 py-2 text-xs font-medium whitespace-pre-line text-center ${
                              inRange ? 'bg-gray-50 text-gray-700' : 'bg-gray-100 text-gray-400'
                            }`}
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
                        <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 text-right sticky left-0 z-10">
                          {formatHour(hour)}
                        </th>
                        {week.dates.map(date => {
                          const isSelected = isCellSelected(date, hour);
                          const inRange = isDateInRange(date);
                          return (
                            <td
                              key={`${date}_${hour}`}
                              className={`
                                border border-gray-300 w-16 h-10 cursor-pointer transition-colors
                                ${!inRange
                                  ? 'bg-gray-100 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-green-400 hover:bg-green-500'
                                  : 'bg-white hover:bg-gray-100'
                                }
                              `}
                              onMouseDown={() => handleMouseDown(date, hour)}
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

      <div className="text-xs text-gray-500">
        <p>💡 Tip: Click and drag across multiple cells to quickly select large time blocks.</p>
      </div>

      {/* Bottom spacing for fixed bar */}
      {selectedCount > 0 && <div className="h-20" />}
    </div>
  );
}
