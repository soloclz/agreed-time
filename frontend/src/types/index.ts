export interface TimeSlot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
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
