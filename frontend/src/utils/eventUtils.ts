/**
 * Event-related utility functions
 * Extracted from components for easier testing
 */

import type { ParticipantInfo } from '../types';

interface SlotData {
  count: number;
  attendees: string[];
}

/**
 * Find the organizer's name from participants list
 */
export function findOrganizerName(participants: ParticipantInfo[]): string | undefined {
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
  return slot.count === 1 && slot.attendees.length === 1 && slot.attendees[0] === organizerName;
}

/**
 * Check if only the organizer has responded
 */
export function isOrganizerOnly(
  totalParticipants: number,
  participants: ParticipantInfo[]
): boolean {
  return totalParticipants === 1 && participants[0]?.is_organizer === true;
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
