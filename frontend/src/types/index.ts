export type EventState = "open" | "closed";

export interface ApiTimeSlot {
  start_at: string; // ISO 8601 UTC string (e.g., "2025-12-08T09:00:00Z")
  end_at: string;   // ISO 8601 UTC string
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  organizer_name?: string; // Organizer's name (defaults to "Organizer")
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
  availability_count: number; // New field from backend
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
  availabilityCount?: number; // Optional: for displaying participant count
}

// ... existing types ...

export interface EventData {

  id: string;

  title: string;

  description: string;

  availableSlots: TimeSlot[]; // Transformed for UI

  slotDuration?: number; // Duration in minutes

  timeZone?: string; // Metadata

  state?: EventState; // "open" | "closed"
}



export interface ResponseData {

  name: string;

  slots: string[]; // This will store the TimeSlot.id (which are strings)

  comment?: string;

}



export interface SubmitAvailabilityPayload {

  participant_name: string;

  time_slot_ids: number[]; // Backend expects i64, so numbers

  comment?: string;

}

// Types for Event Results API
export interface ApiTimeSlotWithParticipants extends ApiTimeSlotWithId {
  participants: string[]; // List of participant names
}

export interface ParticipantInfo {
  name: string;
  comment?: string;
  is_organizer: boolean;
}

export interface EventResultsResponse {
  id: string;
  title: string;
  description?: string;
  time_zone?: string;
  state: EventState;
  time_slots: ApiTimeSlotWithParticipants[];
  participants: ParticipantInfo[]; // List of all participants with comments
  total_participants: number;
}

export interface OrganizerEventResponse {
  id: string;
  public_token: string;
  organizer_token: string;
  title: string;
  description?: string;
  time_zone?: string;
  state: EventState;
  time_slots: ApiTimeSlotWithParticipants[];
  participants: ParticipantInfo[];
  total_participants: number;
  created_at: string; // ISO 8601 timestamp
}

