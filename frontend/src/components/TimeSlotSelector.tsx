import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { ApiTimeRange, TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import TimeSlotCell from './TimeSlotCell';
import TimeGrid from './TimeGrid';
import FloatingEditMenu from './FloatingEditMenu';
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
import { useHistory } from '../hooks/useHistory';

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
  onRangesChange?: (ranges: ApiTimeRange[]) => void;
  initialRanges?: ApiTimeRange[];
  availableRanges?: ApiTimeRange[];
  slotDuration?: number;
}

const DEFAULT_RANGES: ApiTimeRange[] = [];

// Define the complete state managed by history
interface CalendarState {
  selectedCells: Set<string>;
  startDate: string;
  endDate: string;
  startHour: number;
  endHour: number;
}

export default function TimeSlotSelector({ 
  onRangesChange, 
  initialRanges = DEFAULT_RANGES, 
  availableRanges, 
  slotDuration = 60,
}: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);

  // Determine if it's Guest Mode
  const isGuestMode = availableRanges !== undefined;
  // Based on feedback, only highlight weekends in Organizer mode
  const highlightWeekends = !isGuestMode;

  // Convert initial ranges to selected cells set
  const initialSelectedCells = useMemo(() => {
    return rangesToCells(initialRanges, slotDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialRanges), slotDuration]);

  // Undo/Redo History Management
  // Now managing the FULL state (cells + range)
  const {
    state,
    setState, 
    pushState, 
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  } = useHistory<CalendarState>({
    selectedCells: initialSelectedCells,
    startDate: '', // Will be initialized by effect
    endDate: '',
    startHour: 9,
    endHour: 18
  });

  // Destructure for easier access
  const { selectedCells, startDate, endDate, startHour, endHour } = state;

  // Sync history state with initialSelectedCells on load (if props change)
  useEffect(() => {
    setState({
      ...state,
      selectedCells: initialSelectedCells
    });
    // clearHistory(); // Typically we don't clear history on simple prop updates unless it's a full reset
  }, [initialSelectedCells, setState]);

  // Available cells set for fast lookup in Guest Mode
  const availableCells = useMemo(() => {
    if (!availableRanges) return null;
    return rangesToCells(availableRanges, slotDuration);
  }, [availableRanges, slotDuration]);

  useEffect(() => {
    // Initialize dates/hours based on mode
    if (isGuestMode && availableRanges && availableRanges.length > 0) {
      const dates: string[] = [];
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      availableRanges.forEach(range => {
        const start = new Date(range.start_at);
        const end = new Date(range.end_at);
        
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        
        startTimes.push(start.getHours() + start.getMinutes() / 60);
        endTimes.push(end.getHours() + end.getMinutes() / 60);
      });

      dates.sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
      const minSlotHour = Math.floor(Math.min(...startTimes));
      const maxSlotHour = Math.ceil(Math.max(...endTimes));

      const displayStartHour = Math.min(minSlotHour, 9);
      const displayEndHour = Math.max(maxSlotHour, 18);

      setState(prev => ({
        ...prev,
        startDate: minDate,
        endDate: maxDate,
        startHour: displayStartHour,
        endHour: displayEndHour
      }));

    } else {
      // Organizer Mode: Default to 4 weeks from today
      const today = getTodayLocal();
      const future = addDays(today, 27);

      setState(prev => ({
        ...prev,
        startDate: today,
        endDate: future
      }));
    }

    setIsMounted(true);
  }, [isGuestMode, availableRanges, setState]);

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

  const handleDateChange = useCallback((type: 'start' | 'end', newDate: string) => {
    const effStart = type === 'start' ? newDate : startDate;
    const effEnd = type === 'end' ? newDate : endDate;

    // Filter out slots that are no longer in the date range
    const newSelectedCells = new Set<string>();
    let hasFiltered = false;

    selectedCells.forEach(key => {
      const [datePart] = key.split('_');
      if (datePart >= effStart && datePart <= effEnd) {
        newSelectedCells.add(key);
      } else {
        hasFiltered = true;
      }
    });

    const newState = {
      ...state,
      startDate: effStart,
      endDate: effEnd,
      selectedCells: newSelectedCells
    };

    // Push to history so undo restores the previous range AND the deleted slots
    pushState(newState);

    if (hasFiltered && onRangesChange) {
      onRangesChange(cellsToRanges(newSelectedCells, slotDuration));
    }
  }, [state, startDate, endDate, selectedCells, pushState, onRangesChange, slotDuration]);

  const handleTimeChange = useCallback((type: 'start' | 'end', newHour: number) => {
    const effStartHour = type === 'start' ? newHour : startHour;
    const effEndHour = type === 'end' ? newHour : endHour;

    // Filter out slots that are no longer in the time range
    const newSelectedCells = new Set<string>();
    let hasFiltered = false;

    selectedCells.forEach(key => {
      const [, hourStr] = key.split('_');
      const hour = parseFloat(hourStr);
      if (hour >= effStartHour && hour < effEndHour) {
        newSelectedCells.add(key);
      } else {
        hasFiltered = true;
      }
    });

    const newState = {
      ...state,
      startHour: effStartHour,
      endHour: effEndHour,
      selectedCells: newSelectedCells
    };

    // Push to history
    pushState(newState);

    if (hasFiltered && onRangesChange) {
      onRangesChange(cellsToRanges(newSelectedCells, slotDuration));
    }
  }, [state, startHour, endHour, selectedCells, pushState, onRangesChange, slotDuration]);

  const {
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
    // Pass managed state
    value: selectedCells,
    // Update only the cells part of the state (live update during drag)
    onChange: (newCells) => setState({ ...state, selectedCells: newCells }),
    onDragStart: () => {
        // Snapshot current FULL state to history
        pushState({ ...state, selectedCells: new Set(selectedCells) });
    }
  });

  const isCellSelected = (date: string, hour: number): boolean => {
    return selectedCells.has(getCellKey(date, hour));
  };
  
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
  
  const handleHeaderClick = (date: string) => {
    // Snapshot state
    pushState({ ...state, selectedCells: new Set(selectedCells) });

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

    const newSet = new Set(selectedCells);
    if (allSelected) {
      allCellsInColumn.forEach(key => newSet.delete(key));
    } else {
      allCellsInColumn.forEach(key => newSet.add(key));
    }
    
    // Update state
    setState({ ...state, selectedCells: newSet });
  };

  // Logic to copy first week's pattern to subsequent weeks
  const copyFirstWeekPattern = () => {
    if (!startDate || !endDate) return;

    // 1. Extract pattern
    const pattern = new Map<number, Set<number>>();
    let hasPattern = false;

    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      if (date > endDate) break;

      const dayPattern = new Set<number>();
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

    // 2. Extend Date Range if needed
    let targetEndDate = endDate;
    const currentDurationDays = diffInDays(startDate, endDate) + 1;
    let rangeUpdated = false;
    
    if (currentDurationDays < 14) {
      targetEndDate = addDays(startDate, 27);
      rangeUpdated = true;
    }

    // 3. Apply pattern
    const newSelectedCells = new Set<string>();
    
    // Keep existing first week
    for (let i = 0; i < 7; i++) {
        const date = addDays(startDate, i);
        if (date > targetEndDate) break; // Check against new target
        const durationInHours = slotDuration / 60;
        let currentHour = startHour;
        while (currentHour < endHour) {
            const key = getCellKey(date, currentHour);
            if (selectedCells.has(key)) {
                newSelectedCells.add(key);
            }
            currentHour += durationInHours;
        }
    }

    let currentDayOffset = 7; 
    let currentDate = addDays(startDate, currentDayOffset);

    while (currentDate <= targetEndDate) {
      const patternDayIndex = currentDayOffset % 7;
      const hoursToSelect = pattern.get(patternDayIndex);

      if (hoursToSelect) {
        hoursToSelect.forEach(hour => {
          const key = getCellKey(currentDate, hour);
          newSelectedCells.add(key);
        });
      }

      currentDayOffset++;
      currentDate = addDays(startDate, currentDayOffset);
    }

    // Commit to history: New Cells AND New Date Range
    pushState({
        ...state,
        selectedCells: newSelectedCells,
        endDate: targetEndDate
    });
    
    if (onRangesChange) {
        const ranges = cellsToRanges(newSelectedCells, slotDuration);
        onRangesChange(ranges);
    }
    
    if (rangeUpdated) {
        toast('Extended date range to 4 weeks and copied pattern', { icon: '📅' });
    } else {
        toast.success(`Copied pattern to following weeks!`);
    }
  };

  const hasFirstWeekSelection = useMemo(() => {
    if (!startDate || selectedCells.size === 0) return false;
    const durationInHours = slotDuration / 60;
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      let currentHour = startHour;
      while (currentHour < endHour) {
        if (selectedCells.has(getCellKey(date, currentHour))) {
          return true;
        }
        currentHour += durationInHours;
      }
    }
    return false;
  }, [selectedCells, startDate, startHour, endHour, slotDuration]);

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
        id: key, 
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
      {/* Header and Controls */}
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
                    onChange={(e) => handleDateChange('start', e.target.value)}
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
                    onChange={(e) => handleDateChange('end', e.target.value)}
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
                    onChange={(e) => handleTimeChange('start', parseInt(e.target.value))}
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
                    onChange={(e) => handleTimeChange('end', parseInt(e.target.value))}
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
          onRemoveSlot={(slotId) => {
             // Snapshot current state before removal
             pushState({ ...state, selectedCells: new Set(selectedCells) });
             removeSlot(slotId);
          }}
          onClearAll={() => {
            // Snapshot before clearing
            pushState({ ...state, selectedCells: new Set(selectedCells) }); 
            setShowBottomPanel(false);
            
            // Clear cells via setState (updates live state without another history push)
            setState({ ...state, selectedCells: new Set() });
            if (onRangesChange) onRangesChange([]);
          }}
          showBottomPanel={showBottomPanel}
          onTogglePanel={() => setShowBottomPanel(!showBottomPanel)}
      />
      
      <div className="flex flex-col gap-1">
        <TimeGrid
            startDate={startDate}
            endDate={endDate}
            startHour={startHour}
            endHour={endHour}
            slotDuration={slotDuration}
            highlightWeekends={highlightWeekends}
            onGridMount={setGridElement}
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
                highlightWeekends={highlightWeekends}
                gridScrollElement={gridElement}
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

        {/* Footer Area with TIP and FloatingEditMenu */}
        <div className="mt-1 pt-1 relative min-h-[3rem]">
            <div className="text-xs text-gray-500 font-mono pr-12 sm:pr-0 flex">
                <span className="flex-shrink-0 mr-1">💡</span>
                <span className="flex-grow">CLICK AND DRAG TO SELECT MULTIPLE SLOTS.</span>
            </div>
            
            {highlightWeekends && (
                <div className="absolute right-0 top-4 sm:top-0">
                    <FloatingEditMenu 
                    onCopyPattern={copyFirstWeekPattern} 
                    canCopy={hasFirstWeekSelection}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
