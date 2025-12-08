import type { EventData, ResponseData, ApiTimeSlot, CreateEventPayload, CreateEventSuccessResponse } from '../types';

// API base URL - adjust as needed for production vs development
// For local development, assume backend is on port 3000
const API_BASE_URL = 'http://localhost:3000/api';

// --- MOCK DATA (only for getEvent, submitResponse, getEventResults for now) ---
// Note: MOCK_EVENT_DATA and MOCK_RESPONSES might need updates to align with new ApiTimeSlot if these mocks are to be truly used
const MOCK_EVENT_DATA: EventData = {
  id: 'mock-event-id',
  title: 'My Mock Event Title',
  description: 'Help us find the perfect time that works for everyone (Mock).',
  slotDuration: 60,
  availableSlots: [], // No longer relevant for new ApiTimeSlot structure
};

const MOCK_RESPONSES: ResponseData[] = [
  // ... (keep existing mock responses or simplify if not used)
  { name: 'Alice', slots: ['2025-12-08T01:00:00.000Z', '2025-12-08T02:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Prefer earlier' },
  { name: 'Bob', slots: ['2025-12-08T02:00:00.000Z', '2025-12-09T05:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Only Tuesdays' },
  { name: 'Charlie', slots: ['2025-12-08T03:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Wednesdays are best' },
  { name: 'David', slots: ['2025-12-09T05:00:00.000Z', '2025-12-11T01:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
  { name: 'Eve', slots: ['2025-12-10T09:00:00.000Z', '2025-12-11T01:00:00:00.000Z', '2025-12-12T02:00:00.000Z'], comment: 'Flexible!' },
  { name: 'Frank', slots: ['2025-12-08T01:00:00.000Z', '2025-12-12T02:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
  { name: 'Grace', slots: ['2025-12-09T05:00:00.000Z', '2025-12-11T01:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
];


// In-memory store for created events (simulates DB for the session)
const eventsStore: Record<string, EventData> = {}; // Initialize empty

const responsesStore: Record<string, ResponseData[]> = {}; // Initialize empty

// Simulates network delay (only for mock functions)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const eventService = {
  getEvent: async (id: string): Promise<EventData | null> => {
    await delay(500); // Simulate network delay
    console.warn('Using mock for getEvent');
    return eventsStore[id] || null;
  },

  createEvent: async (
    title: string,
    description: string | undefined,
    timeZone: string | undefined,
    timeSlots: ApiTimeSlot[]
  ): Promise<CreateEventSuccessResponse> => {
    const payload: CreateEventPayload = {
      title,
      description: description || undefined, // Ensure undefined if empty
      time_zone: timeZone || undefined, // Ensure undefined if empty
      time_slots: timeSlots,
    };

    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create event');
    }

    return response.json() as Promise<CreateEventSuccessResponse>;
  },

  submitResponse: async (eventId: string, response: ResponseData): Promise<void> => {
    await delay(800); // Simulate network delay
    console.warn('Using mock for submitResponse');
    if (!responsesStore[eventId]) {
        responsesStore[eventId] = [];
    }
    responsesStore[eventId].push(response);
  },

  getEventResults: async (eventId: string): Promise<{ event: EventData, responses: ResponseData[] } | null> => {
    await delay(800); // Simulate network delay
    console.warn('Using mock for getEventResults');
    const event = eventsStore[eventId];
    if (!event) return null;
    
    return {
      event,
      responses: responsesStore[eventId] || []
    };
  }
};