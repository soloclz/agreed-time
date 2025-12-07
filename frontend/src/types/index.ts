export interface TimeSlot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface HeatmapCellData {
  count: number;
  attendees: string[];
}

export interface GridCell {
  date: string;
  hour: number;
  isSelected: boolean;
}

export interface TimeRange {
  startHour: number;
  endHour: number;
}

export interface TimeSlotConfig {
  slotDuration: number; // Duration in minutes: 30, 60, 120, 240 (half-day), 480 (full-day)
  displayMode?: 'hourly' | 'half-hourly' | 'half-day' | 'full-day';
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  availableSlots: TimeSlot[];
  slotDuration?: number; // Duration in minutes
}

export interface ResponseData {
  name: string;
  slots: string[]; // ISO strings (or IDs if we switch to IDs later, but currently ISO strings from MOCK)
  comment?: string;
}

export interface EventCreationResult {
  eventId: string;
  adminToken: string;
  secureCode: string;
  eventTitle: string;
}