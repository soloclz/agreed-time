/**
 * Event-related utility functions
 * Extracted from components for easier testing
 */

import type { ParticipantAvailability, ApiTimeRange } from '../types';

interface SlotData {
  count: number;
  participants: string[];
}

/**
 * Find the organizer's name from participants list
 */
export function findOrganizerName(participants: ParticipantAvailability[]): string | undefined {
  return participants.find(p => p.is_organizer)?.name;
}

/**
 * Check if a slot only has the organizer
 */
export function isOrganizerOnlySlot(
  slot: SlotData,
  organizerName: string | undefined
): boolean {
  if (!organizerName) return false;
  return slot.count === 1 && slot.participants.length === 1 && slot.participants[0] === organizerName;
}

/**
 * Check if only the organizer has responded
 */
export function isOrganizerOnly(
  totalParticipants: number,
  participants: ParticipantAvailability[]
): boolean {
  return totalParticipants === 1 && participants.length > 0 && participants[0].is_organizer === true;
}

/**
 * Filter slots to exclude organizer-only slots when there are multiple participants
 */
export function filterOrganizerOnlySlots<T extends SlotData>(
  slots: T[],
  totalParticipants: number,
  organizerName: string | undefined
): T[] {
  if (totalParticipants <= 1) {
    return slots;
  }

  return slots.filter(slot => !isOrganizerOnlySlot(slot, organizerName));
}

// --- Range Conversion Utils ---

// Helper to generate cell key: "YYYY-MM-DD_H.5"
export const getCellKey = (date: string, hour: number): string => `${date}_${hour}`;

/**
 * Convert backend time ranges (UTC) to a Set of selected grid cell keys (Local)
 */
export function rangesToCells(ranges: ApiTimeRange[], slotDuration: number): Set<string> {
  const cells = new Set<string>();
  
  ranges.forEach(range => {
    const start = new Date(range.start_at);
    const end = new Date(range.end_at);
    
    // Iterate from start to end by slotDuration minutes
    let current = new Date(start);
    // Use getTime() to compare to avoid issues
    while (current.getTime() < end.getTime()) {
      // Local Date Key
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Local Hour (decimal)
      const hour = current.getHours() + current.getMinutes() / 60;
      
      cells.add(getCellKey(dateStr, hour));
      
      // Increment
      current.setMinutes(current.getMinutes() + slotDuration);
    }
  });
  
  return cells;
}

/**
 * Convert selected grid cell keys (Local) to merged backend time ranges (UTC)
 */
export function cellsToRanges(selectedCells: Set<string>, slotDuration: number): ApiTimeRange[] {
  if (selectedCells.size === 0) return [];

  // 1. Convert keys to sorted Date objects
  const slots = Array.from(selectedCells).map(key => {
    const [dateStr, hourStr] = key.split('_');
    const hour = parseFloat(hourStr);
    
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date in local time
    const start = new Date(year, month - 1, day);
    const startHours = Math.floor(hour);
    const startMinutes = Math.round((hour % 1) * 60);
    start.setHours(startHours);
    start.setMinutes(startMinutes);
    start.setSeconds(0);
    start.setMilliseconds(0);
    
    return start;
  });
  
  // Sort by time
  slots.sort((a, b) => a.getTime() - b.getTime());
  
  // 2. Merge adjacent slots
  const ranges: ApiTimeRange[] = [];
  let currentStart = slots[0];
  let currentEnd = new Date(currentStart);
  currentEnd.setMinutes(currentEnd.getMinutes() + slotDuration);
  
  for (let i = 1; i < slots.length; i++) {
    const nextStart = slots[i];
    
    // Check if next slot starts exactly when current ends
    // Allow small tolerance for floating point math if needed, but here we use Date/getTime so it's int
    if (Math.abs(nextStart.getTime() - currentEnd.getTime()) < 1000) {
      // Adjacent: extend current range
      currentEnd.setMinutes(currentEnd.getMinutes() + slotDuration);
    } else {
      // Gap: push current and start new
      ranges.push({
        start_at: currentStart.toISOString(),
        end_at: currentEnd.toISOString()
      });
      currentStart = nextStart;
      currentEnd = new Date(currentStart);
      currentEnd.setMinutes(currentEnd.getMinutes() + slotDuration);
    }
  }
  
  // Push the last range
  ranges.push({
    start_at: currentStart.toISOString(),
    end_at: currentEnd.toISOString()
  });
  
  return ranges;
}
