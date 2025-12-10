export type EventState = "open" | "closed";

// 基礎的時間範圍介面
export interface ApiTimeRange {
  start_at: string;
  end_at: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  organizer_name: string;
  time_zone?: string;
  slot_duration?: number;
  time_slots: ApiTimeRange[];
}

export interface CreateEventSuccessResponse {
  id: string; // UUID
  public_token: string;
  organizer_token: string;
}

// Backend DB: event_slots
export interface ApiEventSlot extends ApiTimeRange {
  id: number;
  event_id: string;
}

// GET /api/events/:token
export interface EventResponse {
  id: string;
  title: string;
  description?: string;
  time_zone?: string;
  slot_duration: number;
  state: EventState;
  event_slots: ApiEventSlot[];
  organizer_name: string;
}

// --- UI Types ---

export interface GridCell {
  date: string;
  hour: number;
  startTime: string;
  endTime: string;
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  eventSlots: ApiTimeRange[]; 
  slotDuration: number;
  timeZone?: string; 
  state?: EventState;
  organizerName?: string;
}

// Form Data for Submit Availability
export interface SubmitAvailabilityPayload {
  participant_name: string;
  availabilities: ApiTimeRange[];
}

// --- Results View Types ---

export interface ParticipantAvailability {
  name: string;
  is_organizer: boolean; // Added
  availabilities: ApiTimeRange[];
}

export interface EventResultsResponse {
  id: string;
  title: string;
  description?: string;
  time_zone?: string;
  slot_duration: number;
  state: EventState;
  event_slots: ApiEventSlot[];
  participants: ParticipantAvailability[];
  total_participants: number;
}

export interface OrganizerEventResponse extends EventResultsResponse {
  public_token: string;
  organizer_token: string;
  created_at: string;
}