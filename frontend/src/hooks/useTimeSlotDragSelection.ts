import { useState, useRef, useEffect, useCallback } from 'react';

interface UseTimeSlotDragSelectionProps {
  initialSelectedCells?: Set<string>;
  slotDuration: number;
  getCellKey: (date: string, hour: number) => string;
  isSlotSelectable: (date: string, hour: number) => boolean;
  onSelectedCellsChange?: (cells: Set<string>) => void; // Legacy callback (effect based)
  startDate: string; 
  endDate: string;
  
  // Controlled mode props
  value?: Set<string>;
  onChange?: (cells: Set<string>) => void;
  onDragStart?: () => void;
}

export function useTimeSlotDragSelection({
  initialSelectedCells = new Set(),
  slotDuration,
  getCellKey,
  isSlotSelectable,
  onSelectedCellsChange,
  startDate,
  endDate,
  value,
  onChange,
  onDragStart,
}: UseTimeSlotDragSelectionProps) {
  const [internalSelectedCells, setInternalSelectedCells] = useState<Set<string>>(initialSelectedCells);
  
  // Use controlled value if provided, otherwise internal state
  const isControlled = value !== undefined;
  const selectedCells = isControlled ? value : internalSelectedCells;
  
  // Unified setter
  const updateSelectedCells = useCallback((newState: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (isControlled && onChange) {
      // If it's a functional update, we need to resolve it with current state
      const resolvedState = typeof newState === 'function' ? newState(selectedCells) : newState;
      onChange(resolvedState);
    } else {
      setInternalSelectedCells(newState);
    }
  }, [isControlled, onChange, selectedCells]);

  // Expose setSelectedCells (now updateSelectedCells)
  const setSelectedCells = updateSelectedCells;

  // Interaction state
  const isDragging = useRef(false);
  const dragMode = useRef<'select' | 'deselect'>('select');
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  // Ref for callback to avoid dependency cycles
  const onSelectedCellsChangeRef = useRef(onSelectedCellsChange);
  useEffect(() => {
    onSelectedCellsChangeRef.current = onSelectedCellsChange;
  }, [onSelectedCellsChange]);

  // Ref for fresh state in event listeners
  const selectedCellsRef = useRef(selectedCells);
  useEffect(() => {
    selectedCellsRef.current = selectedCells;
    if (onSelectedCellsChangeRef.current) {
      onSelectedCellsChangeRef.current(selectedCells);
    }
  }, [selectedCells]);

  // Update internal state if initialSelectedCells changes (only in uncontrolled mode)
  useEffect(() => {
    if (!isControlled) {
      setInternalSelectedCells(initialSelectedCells);
    }
  }, [initialSelectedCells, isControlled]);

  // Clean up selected cells that fall outside the new date range
  useEffect(() => {
    if (!startDate || !endDate) return;

    // Use current state (ref or dep) to calculate cleanup
    // We need to be careful not to trigger infinite loops in controlled mode
    // Let's perform cleanup only if strictly necessary? 
    // Actually, parent usually handles this or we rely on display logic.
    // But keeping state clean is good.
    
    // Logic: Iterate current cells, if any outside, update.
    let hasOutside = false;
    selectedCells.forEach(key => {
        const [datePart] = key.split('_');
        if (datePart < startDate || datePart > endDate) {
            hasOutside = true;
        }
    });

    if (hasOutside) {
        const newSet = new Set<string>();
        selectedCells.forEach(key => {
            const [datePart] = key.split('_');
            if (datePart >= startDate && datePart <= endDate) {
            newSet.add(key);
            }
        });
        updateSelectedCells(newSet);
    }
  }, [startDate, endDate, updateSelectedCells, selectedCells]); // Added selectedCells dep

  const toggleCell = useCallback((date: string, hour: number) => {
    if (!isSlotSelectable(date, hour)) return;
    const key = getCellKey(date, hour);
    
    updateSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  }, [isSlotSelectable, getCellKey, updateSelectedCells]);

  const setCell = useCallback((date: string, hour: number, selected: boolean) => {
    if (!isSlotSelectable(date, hour)) return;
    const key = getCellKey(date, hour);
    
    updateSelectedCells(prev => {
      const newSet = new Set(prev);
      if (selected) newSet.add(key);
      else newSet.delete(key);
      return newSet;
    });
  }, [isSlotSelectable, getCellKey, updateSelectedCells]);

  const removeSlot = useCallback((key: string) => {
    updateSelectedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, [updateSelectedCells]);

  const clearAllSlots = useCallback(() => {
    updateSelectedCells(new Set());
  }, [updateSelectedCells]);

  const handleMouseDown = useCallback((e: React.MouseEvent, date: string, hour: number) => {
    if (e.button !== 0) return; // Only left click

    e.preventDefault(); // Prevent text selection
    isDragging.current = true;
    
    // Notify drag start (e.g. for undo snapshot)
    if (onDragStart) onDragStart();

    const key = getCellKey(date, hour);
    const isSelected = selectedCellsRef.current.has(key);
    dragMode.current = isSelected ? 'deselect' : 'select';
    toggleCell(date, hour);
  }, [toggleCell, getCellKey, onDragStart]);

  const handleMouseEnter = useCallback((date: string, hour: number) => {
    if (isDragging.current) {
      setCell(date, hour, dragMode.current === 'select');
    }
  }, [setCell]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Touch handlers
  useEffect(() => {
    const grid = document.querySelector('.time-grid-scroll-area');
    if (!grid) return;

    const isCellSelectedFresh = (date: string, hour: number): boolean => {
      const key = getCellKey(date, hour);
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
      
      const touch = touchEvent.touches[0];
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };

      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = window.setTimeout(() => {
        const hour = parseFloat(hourStr);
        isDragging.current = true;
        
        // Notify drag start
        if (onDragStart) onDragStart();

        // Safe vibration: wrapped in try-catch to avoid console warnings
        try {
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        } catch (e) {
          // Vibration not allowed or not supported, silently ignore
        }

        const isSelected = isCellSelectedFresh(date, hour);
        dragMode.current = isSelected ? 'deselect' : 'select';
        toggleCell(date, hour);
      }, 500);
    };

    const handleNativeTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const touch = touchEvent.touches[0];
      
      if (touchStartPositionRef.current && !isDragging.current) {
        const moveX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
        const moveY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
        
        if (moveX > 10 || moveY > 10) {
          if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = undefined;
          }
        }
        return;
      }

      if (!isDragging.current) return;
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
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
      isDragging.current = false;
      touchStartPositionRef.current = null;
    };

    grid.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    grid.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    grid.addEventListener('touchend', handleNativeTouchEnd, { passive: false });

    return () => {
      grid.removeEventListener('touchstart', handleNativeTouchStart);
      grid.removeEventListener('touchmove', handleNativeTouchMove);
      grid.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [getCellKey, isSlotSelectable, slotDuration, toggleCell, setCell, startDate, endDate]);

  return {
    selectedCells,
    setSelectedCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    toggleCell,
    setCell,
    removeSlot,
    clearAllSlots,
  };
}