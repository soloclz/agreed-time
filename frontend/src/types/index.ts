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

// ... existing types ...

export interface CreateEventSuccessResponse {
  id: string; // UUID
  public_token: string;
  organizer_token: string;
}

// Types for Fetching Event (GET /api/events/:token)
export interface ApiTimeSlotWithId extends ApiTimeSlot {
  id: number;
  event_id: string;
}

export interface EventResponse {
  id: string;
  title: string;
  description?: string;
  time_zone?: string;
  state: EventState;
  time_slots: ApiTimeSlotWithId[];
}

// --- UI Types ---

export interface TimeSlot {
  id: string;
  date: string; // "YYYY-MM-DD" (Local)
  startTime: string; // "HH:MM" (Local)
  endTime: string; // "HH:MM" (Local)
}

// ... existing types ...

export interface EventData {
  id: string;
  title: string;
  description: string;
  availableSlots: TimeSlot[]; // Transformed for UI
  slotDuration?: number; // Duration in minutes
  timeZone?: string; // Metadata
}

// ... existing types ...

export interface ResponseData {
  name: string;
  slots: string[]; // ISO strings (or IDs if we switch to IDs later, but currently ISO strings from MOCK)
  comment?: string;
}