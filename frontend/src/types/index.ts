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
  id: string; // Key "YYYY-MM-DD_HH.5"
  date: string;
  hour: number;
  startTime: string;
  endTime: string;
}

export type TimeSlot = GridCell;

export interface HeatmapCellData {
  date: string;
  hour: number;
  count: number;
  ratio: number;
  participants: string[];
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
  comment?: string;
}

export interface SubmitAvailabilitySuccessResponse {
  participant_token: string;
}

export interface UpdateParticipantPayload {
  participant_name: string;
  availabilities: ApiTimeRange[];
  comment?: string;
}

export interface ParticipantResponse {
  participant_token: string; // This is the UUID
  name: string;
  comment?: string;
  availabilities: ApiTimeRange[];
}

// --- Results View Types ---

export interface ParticipantAvailability {
  name: string;
  is_organizer: boolean; // Added
  comment?: string; // Added
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

export interface ApiErrorResponse {
  error: string;
  code?: string;
  message?: string;
}