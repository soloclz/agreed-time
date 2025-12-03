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
