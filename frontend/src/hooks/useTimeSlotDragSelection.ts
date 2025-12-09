import { useState, useRef, useEffect, useCallback } from 'react';
import type { TimeSlot } from '../types';

interface UseTimeSlotDragSelectionProps {
  initialSelectedCells?: Set<string>;
  slotDuration: number;
  getCellKey: (date: string, startTime: string, endTime: string) => string;
  getTimeSlotFromHour: (hour: number, duration: number) => { startTime: string; endTime: string };
  isSlotSelectable: (date: string, hour: number) => boolean;
  onSelectedCellsChange?: (cells: Set<string>) => void;
  startDate: string; 
  endDate: string;
}

export function useTimeSlotDragSelection({
  initialSelectedCells = new Set(),
  slotDuration,
  getCellKey,
  getTimeSlotFromHour,
  isSlotSelectable,
  onSelectedCellsChange,
  startDate,
  endDate,
}: UseTimeSlotDragSelectionProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(initialSelectedCells);

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

  // Clean up selected cells that fall outside the new date range
  useEffect(() => {
    if (!startDate || !endDate) return;

    setSelectedCells(prev => {
      const newSet = new Set<string>();
      let hasChanges = false;

      prev.forEach(key => {
        const [datePart] = key.split('_');
        if (datePart >= startDate && datePart <= endDate) {
          newSet.add(key);
        } else {
          hasChanges = true;
        }
      });

      return hasChanges ? newSet : prev;
    });
  }, [startDate, endDate]);

  const toggleCell = useCallback((date: string, hour: number) => {
    if (!isSlotSelectable(date, hour)) return;
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    const key = getCellKey(date, startTime, endTime);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  }, [isSlotSelectable, getTimeSlotFromHour, getCellKey, slotDuration]);

  const setCell = useCallback((date: string, hour: number, selected: boolean) => {
    if (!isSlotSelectable(date, hour)) return;
    const { startTime, endTime } = getTimeSlotFromHour(hour, slotDuration);
    const key = getCellKey(date, startTime, endTime);
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (selected) newSet.add(key);
      else newSet.delete(key);
      return newSet;
    });
  }, [isSlotSelectable, getTimeSlotFromHour, getCellKey, slotDuration]);

  const removeSlot = useCallback((key: string) => {
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  const clearAllSlots = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, date: string, hour: number) => {
    if (e.button !== 0) return; // Only left click

    e.preventDefault(); // Prevent text selection
    isDragging.current = true;

    const isSelected = selectedCellsRef.current.has(getCellKey(date, getTimeSlotFromHour(hour, slotDuration).startTime, getTimeSlotFromHour(hour, slotDuration).endTime));
    dragMode.current = isSelected ? 'deselect' : 'select';
    toggleCell(date, hour);
  }, [toggleCell, getCellKey, getTimeSlotFromHour, slotDuration]);

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
      
      const touch = touchEvent.touches[0];
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };

      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }

      longPressTimerRef.current = window.setTimeout(() => {
        const hour = parseFloat(hourStr);
        isDragging.current = true;
        if (navigator.vibrate) navigator.vibrate(50);

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
  }, [getCellKey, getTimeSlotFromHour, isSlotSelectable, slotDuration, toggleCell, setCell, startDate, endDate]);

  return {
    selectedCells,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    toggleCell,
    setCell,
    removeSlot,
    clearAllSlots,
  };
}
