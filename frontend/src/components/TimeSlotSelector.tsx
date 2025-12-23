import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import type { ApiTimeRange, TimeSlot } from '../types';
import TimeSlotBottomPanel from './TimeSlotBottomPanel';
import TimeSlotCell from './TimeSlotCell';
import TimeGrid from './TimeGrid';
import FloatingEditMenu from './FloatingEditMenu';
import {
  getTodayLocal,
  addDays,
  formatHour,
} from '../utils/dateUtils';
import {
  getCellKey,
  rangesToCells,
  cellsToRanges
} from '../utils/eventUtils';
import { useTimeSlotDragSelection } from '../hooks/useTimeSlotDragSelection';
import { useHistory } from '../hooks/useHistory';
import { GRID_STYLES } from '../constants/gridStyles';
import { mergeWeek1PatternIntoFollowingWeeks } from '../utils/weekPatternUtils';

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
  initialStartDate?: string;
  initialEndDate?: string;
}

const DEFAULT_RANGES: ApiTimeRange[] = [];
const TUTORIAL_STORAGE_KEY = 'timegrid_tutorial_seen';

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
  initialStartDate = '',
  initialEndDate = '',
}: TimeSlotSelectorProps) {
  // Hydration fix: Track mounted state
  const [isMounted, setIsMounted] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<'idle' | 'header' | 'grid' | 'done'>('idle');
  const [focusPosition, setFocusPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const firstDateHeaderRef = useRef<HTMLButtonElement | null>(null);
  const firstSelectableCellRef = useRef<HTMLTableCellElement | null>(null);

  // Determine if it's Guest Mode
  const isGuestMode = availableRanges !== undefined;
  // Based on feedback, only highlight weekends in Organizer mode
  const highlightWeekends = !isGuestMode;
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);

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
    canRedo
  } = useHistory<CalendarState>({
    selectedCells: initialSelectedCells,
    startDate: initialStartDate,
    endDate: initialEndDate,
    startHour: 9,
    endHour: 18
  });

  // Destructure for easier access
  const { selectedCells, startDate, endDate, startHour, endHour } = state;

  // Sync history state with initialSelectedCells on load (if props change)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      selectedCells: initialSelectedCells
    }));
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
      // Organizer Mode: Default to 5 weeks from today
      const today = getTodayLocal();
      const future = addDays(today, 34);

      setState(prev => ({
        ...prev,
        startDate: today,
        endDate: future
      }));
    }

    setIsMounted(true);
  }, [isGuestMode, availableRanges, setState]);

  // Two-step tutorial
  useEffect(() => {
    if (!isMounted) return;
    let timer: number | undefined;
    try {
      const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!seen) {
        timer = window.setTimeout(() => setTutorialStep('header'), 400);
      } else {
        setTutorialStep('done');
      }
    } catch (_) {
      timer = window.setTimeout(() => setTutorialStep('header'), 400);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isMounted]);

  const computeFocusPosition = useCallback(() => {
    if (!gridWrapperRef.current) return;
    const wrapperRect = gridWrapperRef.current.getBoundingClientRect();
    let target: HTMLElement | null = null;

    if (tutorialStep === 'header') {
      target = firstDateHeaderRef.current;
    } else if (tutorialStep === 'grid') {
      target = firstSelectableCellRef.current;
    }

    if (!target) {
      setFocusPosition(null);
      return;
    }

    const targetRect = target.getBoundingClientRect();
    setFocusPosition({
      top: targetRect.top - wrapperRect.top,
      left: targetRect.left - wrapperRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, [tutorialStep]);

  useLayoutEffect(() => {
    if (tutorialStep === 'done' || tutorialStep === 'idle') return;
    computeFocusPosition();
  }, [tutorialStep, computeFocusPosition, startDate, endDate, startHour, endHour, gridElement]);

  const markTutorialSeen = useCallback(() => {
    setTutorialStep('done');
    setFocusPosition(null);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch (_) {
      // Ignore storage failures; hint will simply reappear on next load
    }
  }, []);

  const goToGridStep = useCallback(() => {
    setTutorialStep('grid');
    setFocusPosition(null);
  }, []);

  useEffect(() => {
    if (tutorialStep === 'done' || tutorialStep === 'idle') return;
    const handleReflow = () => computeFocusPosition();

    window.addEventListener('resize', handleReflow);
    const scroller = gridElement;
    if (scroller) scroller.addEventListener('scroll', handleReflow, { passive: true });

    return () => {
      window.removeEventListener('resize', handleReflow);
      const scrollerCleanup = gridElement;
      if (scrollerCleanup) scrollerCleanup.removeEventListener('scroll', handleReflow);
    };
  }, [tutorialStep, computeFocusPosition, gridElement]);

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

  const updateConstraints = useCallback((updates: Partial<CalendarState>) => {
    const nextState = { ...state, ...updates };
    const { startDate, endDate, startHour, endHour, selectedCells } = nextState;

    const newSelectedCells = new Set<string>();
    let hasFiltered = false;

    selectedCells.forEach(key => {
      const [datePart, hourStr] = key.split('_');
      const hour = parseFloat(hourStr);
      
      const inDateRange = datePart >= startDate && datePart <= endDate;
      const inTimeRange = hour >= startHour && hour < endHour;

      if (inDateRange && inTimeRange) {
        newSelectedCells.add(key);
      } else {
        hasFiltered = true;
      }
    });

    pushState({ ...nextState, selectedCells: newSelectedCells });

    if (hasFiltered && onRangesChange) {
      onRangesChange(cellsToRanges(newSelectedCells, slotDuration));
    }
  }, [state, pushState, onRangesChange, slotDuration]);

  const handleDateChange = useCallback((type: 'start' | 'end', newDate: string) => {
    updateConstraints({ 
      [type === 'start' ? 'startDate' : 'endDate']: newDate 
    });
  }, [updateConstraints]);

  const handleTimeChange = useCallback((type: 'start' | 'end', newHour: number) => {
    updateConstraints({ 
      [type === 'start' ? 'startHour' : 'endHour']: newHour 
    });
  }, [updateConstraints]);

  const {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    removeSlot,
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
    onChange: (newCells) => setState(prev => ({ ...prev, selectedCells: newCells })),
    onDragStart: () => {
        // Snapshot current FULL state to history
        pushState(prev => ({ ...prev, selectedCells: new Set(prev.selectedCells) }));
    }
  });

  const isCellSelected = (date: string, hour: number): boolean => {
    return selectedCells.has(getCellKey(date, hour));
  };
  
  const handleGridMouseDown = useCallback((e: any, date: string, hour: number) => {
    if (tutorialStep === 'grid') {
      markTutorialSeen();
    }
    handleMouseDown(e, date, hour);
  }, [tutorialStep, markTutorialSeen, handleMouseDown]);

  const handleHeaderClick = (date: string) => {
    if (tutorialStep === 'header') {
      goToGridStep();
    } else if (tutorialStep === 'grid') {
      markTutorialSeen();
    }

    // Snapshot state
    pushState(prev => ({ ...prev, selectedCells: new Set(prev.selectedCells) }));

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
    setState(prev => ({ ...prev, selectedCells: newSet }));
  };

  // Logic to copy first week's pattern to subsequent weeks
  const copyFirstWeekPattern = () => {
    if (!startDate || !endDate) return;

    const { mergedSelectedCells, hasWeek1Pattern, addedCount } = mergeWeek1PatternIntoFollowingWeeks({
      selectedCells,
      startDate,
      endDate,
      startHour,
      endHour,
      slotDuration,
    });

    if (!hasWeek1Pattern) {
      toast.error('No slots selected in the first week to copy.');
      return;
    }

    if (addedCount === 0) {
      toast('No additional weeks in range to copy into.', { icon: 'ℹ️' });
      return;
    }

    pushState(prev => ({
      ...prev,
      selectedCells: mergeWeek1PatternIntoFollowingWeeks({
        selectedCells: prev.selectedCells,
        startDate: prev.startDate,
        endDate: prev.endDate,
        startHour: prev.startHour,
        endHour: prev.endHour,
        slotDuration,
      }).mergedSelectedCells,
    }));

    if (onRangesChange) {
      const ranges = cellsToRanges(mergedSelectedCells, slotDuration);
      onRangesChange(ranges);
    }

    toast.success('Copied week 1 pattern into following weeks!');
  };

  const hasFirstWeekSelection = useMemo(() => {
    if (!startDate || selectedCells.size === 0) return false;
    const durationInHours = slotDuration / 60;
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(startDate, dayOffset);
      if (date > endDate) break;
      let currentHour = startHour;
      while (currentHour < endHour) {
        if (selectedCells.has(getCellKey(date, currentHour))) {
          return true;
        }
        currentHour += durationInHours;
      }
    }
    return false;
  }, [selectedCells, startDate, endDate, startHour, endHour, slotDuration]);

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

  let firstHeaderCaptured = false;
  let firstSelectableCellCaptured = false;
  const bubbleLeft = focusPosition && gridWrapperRef.current
    ? Math.min(
        Math.max(focusPosition.left - 8, 8),
        Math.max(gridWrapperRef.current.clientWidth - 280, 8),
      )
    : 12;
  const bubbleTop = focusPosition ? focusPosition.top + focusPosition.height + 12 : 16;
  const spotlightStyle = focusPosition
    ? {
        top: Math.max(focusPosition.top - 6, 4),
        left: Math.max(focusPosition.left - 4, 4),
        width: focusPosition.width + 8,
        height: focusPosition.height + 12
      }
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-ink" onMouseLeave={handleMouseUp}>
      {/* Header and Controls */}
      <div>
        <h3 className="text-lg sm:text-xl font-serif font-bold text-ink">
            Select Your Available Time Slots
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-mono">
            Pick when you're free in the grid.
        </p>
      </div>

      {!availableRanges && (
        <div className="bg-paper border border-film-border p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="block text-sm font-bold text-ink mb-2 font-mono uppercase tracking-wider">Date Range</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor="startDate" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">Start</label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink appearance-none min-h-[52px]"
                    title="Start date"
                  />
                </div>
                <span className="text-ink font-bold text-center hidden sm:block">→</span>
                <div className="flex-1 min-w-0">
                  <label htmlFor="endDate" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">End</label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink appearance-none min-h-[52px]"
                    title="End date"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="block text-sm font-bold text-ink mb-2 font-mono uppercase tracking-wider">Time Range</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor="startHour" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">Start Time</label>
                  <select
                    id="startHour"
                    name="startHour"
                    value={startHour}
                    onChange={(e) => handleTimeChange('start', parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink cursor-pointer appearance-none min-h-[52px]"
                    title="Start hour"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{formatHour(i)}</option>
                    ))}
                  </select>
                </div>
                <span className="text-ink font-bold text-center hidden sm:block">→</span>
                <div className="flex-1 min-w-0">
                  <label htmlFor="endHour" className="block sm:hidden text-xs font-mono text-ink/70 mb-1">End Time</label>
	                  <select
	                    id="endHour"
	                    name="endHour"
	                    value={endHour}
	                    onChange={(e) => handleTimeChange('end', parseInt(e.target.value))}
	                    className="w-full px-3 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-mono transition-colors text-ink cursor-pointer appearance-none min-h-[52px]"
	                    title="End hour"
	                  >
	                    {Array.from({ length: 24 }, (_, i) => {
	                      const hourValue = i + 1; // 1..24
	                      return (
	                        <option key={hourValue} value={hourValue}>
	                          {formatHour(hourValue)}
	                        </option>
	                      );
	                    })}
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
             pushState(prev => ({ ...prev, selectedCells: new Set(prev.selectedCells) }));
             removeSlot(slotId);
          }}
          onClearAll={() => {
            // Snapshot before clearing
            pushState(prev => ({ ...prev, selectedCells: new Set(prev.selectedCells) })); 
            setShowBottomPanel(false);
            
            // Clear cells via setState (updates live state without another history push)
            setState(prev => ({ ...prev, selectedCells: new Set() }));
            if (onRangesChange) onRangesChange([]);
          }}
          showBottomPanel={showBottomPanel}
          onTogglePanel={() => setShowBottomPanel(!showBottomPanel)}
      />
      
      <div className="flex flex-col gap-2">
        <div className="relative" ref={gridWrapperRef}>
          {(tutorialStep === 'header' || tutorialStep === 'grid') && focusPosition && (
            <>
              {/* Four overlay panes to blur/dim everything except the focus area */}
              <div
                className="pointer-events-auto absolute z-20 transition-opacity select-none"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(focusPosition.top, 0),
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                }}
              />
              <div
                className="pointer-events-auto absolute z-20 transition-opacity select-none"
                style={{
                  top: focusPosition.top,
                  left: 0,
                  width: Math.max(focusPosition.left, 0),
                  height: focusPosition.height,
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                }}
              />
              <div
                className="pointer-events-auto absolute z-20 transition-opacity select-none"
                style={{
                  top: focusPosition.top,
                  left: focusPosition.left + focusPosition.width,
                  right: 0,
                  height: focusPosition.height,
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                }}
              />
              <div
                className="pointer-events-auto absolute z-20 transition-opacity select-none"
                style={{
                  top: focusPosition.top + focusPosition.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                }}
              />

              {/* Highlight frame for the focus area */}
              <div className="pointer-events-none absolute z-30" style={spotlightStyle}>
                <div className="absolute inset-0 rounded-md shadow-[0_12px_28px_rgba(0,0,0,0.35)] bg-transparent" />
              </div>
              <div
                className="absolute z-40"
                style={{
                  top: bubbleTop,
                  left: bubbleLeft
                }}
              >
                <div className="relative bg-paper border border-film-border shadow-lg rounded-md px-3 py-2 text-[11px] sm:text-xs text-ink max-w-[260px] sm:max-w-[320px]">
                  <div className="absolute left-6 -top-[6px] h-3 w-3 bg-paper border-l border-t border-film-border rotate-45" />
                  <div className="pr-2 leading-relaxed">
                    {tutorialStep === 'header'
                      ? 'Tap or click a date header to toggle the whole day.'
                      : 'Drag to paint slots; on mobile, long press then drag.'}
                  </div>
                  <div className="flex gap-2 pt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
                    {tutorialStep === 'header' ? (
                      <>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-film-border bg-white/85 hover:bg-white text-film-accent"
                          onClick={goToGridStep}
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border border-film-border bg-white/70 hover:bg-white text-ink/70"
                          onClick={markTutorialSeen}
                        >
                          Skip
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1 rounded border border-film-border bg-white/85 hover:bg-white text-film-accent"
                        onClick={markTutorialSeen}
                      >
                        Start selecting
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          <TimeGrid
              startDate={startDate}
              endDate={endDate}
              startHour={startHour}
              endHour={endHour}
              slotDuration={slotDuration}
              highlightWeekends={highlightWeekends}
              onGridMount={setGridElement}
              onMouseDown={handleGridMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseUp={handleMouseUp}
              renderCell={(date, hour, slotLabel, key) => {
                  const shouldCaptureSelectableCell = isSlotSelectable(date, hour) && !firstSelectableCellCaptured;
                  if (shouldCaptureSelectableCell) {
                    firstSelectableCellCaptured = true;
                  }
                  return (
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
                        captureCellRef={shouldCaptureSelectableCell ? (el) => { firstSelectableCellRef.current = el; } : undefined}
                    />
                  );
              }}
              renderDateHeader={(date, defaultHeader) => {
                  const isFirstHeader = !firstHeaderCaptured;
                  if (isFirstHeader) firstHeaderCaptured = true;
                  return (
                      <button
                          ref={isFirstHeader ? (el) => { firstDateHeaderRef.current = el; } : undefined}
                          type="button"
                          className={GRID_STYLES.HEADER_BUTTON_CLASS}
                          onClick={() => handleHeaderClick(date)}
                          aria-label={`Toggle selection for ${date}`}
                      >
                          {defaultHeader}
                      </button>
                  );
              }}
          />
        </div>

        {/* Footer Area with TIP */}
        <div className="mt-1 pt-1 relative min-h-[3rem]">
            <div className="text-xs text-gray-500 font-mono flex">
                <span className="flex-shrink-0 mr-1">💡</span>
                <span className="flex-grow">
                    <span className="md:hidden">Long press & drag on the grid to select time slots. Tap the date header to toggle that day.</span>
                    <span className="hidden md:inline">Click and drag on the grid to select time slots; click a date header to toggle the full day.</span>
                </span>
            </div>
        </div>
      </div>

      {/* Sticky Edit Menu */}
      <div className="sticky bottom-24 z-50 flex justify-end pointer-events-none -mb-12 md:-mr-4 shadow-none">
         <div className="pointer-events-auto relative top-4">
            <FloatingEditMenu 
              onCopyPattern={copyFirstWeekPattern} 
              canCopy={!isGuestMode && hasFirstWeekSelection}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
            />
         </div>
      </div>
    </div>
  );
}
