export type EventState = "open" | "finalized" | "archived"; // 'draft' state removed for MVP

export interface ApiTimeSlot {
  start_at: string; // ISO 8601 UTC string (e.g., "2025-12-08T09:00:00Z")
  end_at: string;   // ISO 8601 UTC string
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  time_zone?: string; // Optional metadata for UI display
  time_slots: ApiTimeSlot[];
}

export interface CreateEventSuccessResponse {
  id: string; // UUID
  public_token: string;
  organizer_token: string;
}

// --- Remaining types for other parts of the application (will be updated as APIs are implemented) ---

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
  availableSlots: TimeSlot[]; // This will need to be ApiTimeSlot[] later
  slotDuration?: number; // Duration in minutes
}

export interface ResponseData {
  name: string;
  slots: string[]; // ISO strings (or IDs if we switch to IDs later, but currently ISO strings from MOCK)
  comment?: string;
}