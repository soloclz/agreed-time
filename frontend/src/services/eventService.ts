import type { EventData, ResponseData, ApiTimeSlot, CreateEventPayload, CreateEventSuccessResponse, EventResponse, TimeSlot } from '../types';

// API base URL - adjust as needed for production vs development
// For local development, assume backend is on port 3000 (via proxy)
const API_BASE_URL = '/api';

// --- MOCK DATA (only for submitResponse, getEventResults for now) ---
const MOCK_RESPONSES: ResponseData[] = [
  // ... (keep existing mock responses or simplify if not used)
  { name: 'Alice', slots: ['2025-12-08T01:00:00.000Z', '2025-12-08T02:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Prefer earlier' },
  { name: 'Bob', slots: ['2025-12-08T02:00:00.000Z', '2025-12-09T05:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Only Tuesdays' },
];

// In-memory store for created events (simulates DB for the session)
const responsesStore: Record<string, ResponseData[]> = {}; // Initialize empty

// Simulates network delay (only for mock functions)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const eventService = {
  // Fetch event by public token (Real API)
  getEvent: async (publicToken: string): Promise<EventData | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${publicToken}`);
      
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch event: ${response.statusText}`);
      }

      const eventResponse: EventResponse = await response.json();

      // Transform API data (UTC) to UI data (Local Time)
      const availableSlots: TimeSlot[] = eventResponse.time_slots.map(slot => {
        const startDate = new Date(slot.start_at);
        const endDate = new Date(slot.end_at);

        // Extract YYYY-MM-DD
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Extract HH:MM
        const startHour = String(startDate.getHours()).padStart(2, '0');
        const startMinute = String(startDate.getMinutes()).padStart(2, '0');
        
        const endHour = String(endDate.getHours()).padStart(2, '0');
        const endMinute = String(endDate.getMinutes()).padStart(2, '0');

        return {
          id: String(slot.id), // Keep ID as string for UI consistency
          date: dateStr,
          startTime: `${startHour}:${startMinute}`,
          endTime: `${endHour}:${endMinute}`
        };
      });

      return {
        id: eventResponse.id,
        title: eventResponse.title,
        description: eventResponse.description || '',
        availableSlots: availableSlots,
        slotDuration: 60, // Default, as backend doesn't return this yet
        timeZone: eventResponse.time_zone,
      };

    } catch (error) {
      console.error("Error fetching event:", error);
      return null;
    }
  },

  createEvent: async (
    title: string,
    description: string | undefined,
    timeZone: string | undefined,
    timeSlots: ApiTimeSlot[]
  ): Promise<CreateEventSuccessResponse> => {
    const payload: CreateEventPayload = {
      title,
      description: description || undefined,
      time_zone: timeZone || undefined,
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
    // This mock is broken now since eventsStore is removed. 
    // We need to implement getEventResults with API call later.
    return null; 
  }
};
