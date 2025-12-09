import { describe, it, expect } from 'vitest';
import {
  findOrganizerName,
  isOrganizerOnlySlot,
  isOrganizerOnly,
  filterOrganizerOnlySlots,
} from './eventUtils';
import type { ParticipantInfo } from '../types';

describe('eventUtils', () => {
  describe('findOrganizerName', () => {
    it('should find organizer from participants list', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Alice', comment: null, is_organizer: false },
        { name: 'Bob', comment: null, is_organizer: true },
        { name: 'Charlie', comment: null, is_organizer: false },
      ];

      expect(findOrganizerName(participants)).toBe('Bob');
    });

    it('should return undefined if no organizer', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Alice', comment: null, is_organizer: false },
      ];

      expect(findOrganizerName(participants)).toBeUndefined();
    });

    it('should return undefined for empty list', () => {
      expect(findOrganizerName([])).toBeUndefined();
    });
  });

  describe('isOrganizerOnlySlot', () => {
    it('should return true for slot with only organizer', () => {
      const slot = { count: 1, attendees: ['Organizer'] };
      expect(isOrganizerOnlySlot(slot, 'Organizer')).toBe(true);
    });

    it('should return false for slot with organizer and others', () => {
      const slot = { count: 2, attendees: ['Organizer', 'Alice'] };
      expect(isOrganizerOnlySlot(slot, 'Organizer')).toBe(false);
    });

    it('should return false for slot with only non-organizer', () => {
      const slot = { count: 1, attendees: ['Alice'] };
      expect(isOrganizerOnlySlot(slot, 'Organizer')).toBe(false);
    });

    it('should return false if organizer name is undefined', () => {
      const slot = { count: 1, attendees: ['Someone'] };
      expect(isOrganizerOnlySlot(slot, undefined)).toBe(false);
    });

    it('should handle empty attendees list', () => {
      const slot = { count: 0, attendees: [] };
      expect(isOrganizerOnlySlot(slot, 'Organizer')).toBe(false);
    });
  });

  describe('isOrganizerOnly', () => {
    it('should return true when only organizer responded', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Organizer', comment: null, is_organizer: true },
      ];

      expect(isOrganizerOnly(1, participants)).toBe(true);
    });

    it('should return false when multiple participants', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Organizer', comment: null, is_organizer: true },
        { name: 'Alice', comment: null, is_organizer: false },
      ];

      expect(isOrganizerOnly(2, participants)).toBe(false);
    });

    it('should return false when only participant is not organizer', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Alice', comment: null, is_organizer: false },
      ];

      expect(isOrganizerOnly(1, participants)).toBe(false);
    });

    it('should return false for empty participants', () => {
      expect(isOrganizerOnly(0, [])).toBe(false);
    });
  });

  describe('filterOrganizerOnlySlots', () => {
    const slots = [
      { count: 3, attendees: ['Organizer', 'Alice', 'Bob'], date: '2025-12-10' },
      { count: 2, attendees: ['Organizer', 'Alice'], date: '2025-12-11' },
      { count: 1, attendees: ['Organizer'], date: '2025-12-12' },
      { count: 1, attendees: ['Alice'], date: '2025-12-13' },
    ];

    it('should filter out organizer-only slots when multiple participants', () => {
      const filtered = filterOrganizerOnlySlots(slots, 3, 'Organizer');

      expect(filtered).toHaveLength(3);
      expect(filtered.map(s => s.date)).toEqual(['2025-12-10', '2025-12-11', '2025-12-13']);
    });

    it('should not filter when total participants is 1', () => {
      const filtered = filterOrganizerOnlySlots(slots, 1, 'Organizer');

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(slots);
    });

    it('should not filter when organizer name is undefined', () => {
      const filtered = filterOrganizerOnlySlots(slots, 3, undefined);

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(slots);
    });

    it('should handle empty slots array', () => {
      const filtered = filterOrganizerOnlySlots([], 3, 'Organizer');

      expect(filtered).toHaveLength(0);
    });

    it('should preserve slot order', () => {
      const orderedSlots = [
        { count: 1, attendees: ['Organizer'], priority: 1 },
        { count: 2, attendees: ['Organizer', 'Alice'], priority: 2 },
        { count: 1, attendees: ['Organizer'], priority: 3 },
        { count: 2, attendees: ['Alice', 'Bob'], priority: 4 },
      ];

      const filtered = filterOrganizerOnlySlots(orderedSlots, 3, 'Organizer');

      expect(filtered.map(s => s.priority)).toEqual([2, 4]);
    });
  });

  describe('integration: realistic scenario', () => {
    it('should handle complete event results filtering', () => {
      const participants: ParticipantInfo[] = [
        { name: 'Alice', comment: 'Flexible', is_organizer: true },
        { name: 'Bob', comment: null, is_organizer: false },
        { name: 'Charlie', comment: 'Morning preferred', is_organizer: false },
      ];

      const allSlots = [
        { count: 3, attendees: ['Alice', 'Bob', 'Charlie'] }, // All available
        { count: 2, attendees: ['Alice', 'Bob'] },            // 2 available
        { count: 1, attendees: ['Alice'] },                   // Only organizer
        { count: 2, attendees: ['Bob', 'Charlie'] },          // 2 non-organizers
      ];

      const organizerName = findOrganizerName(participants);
      expect(organizerName).toBe('Alice');

      const isOnlyOrganizer = isOrganizerOnly(3, participants);
      expect(isOnlyOrganizer).toBe(false);

      const filtered = filterOrganizerOnlySlots(allSlots, 3, organizerName);
      expect(filtered).toHaveLength(3); // Exclude organizer-only slot
    });
  });
});
