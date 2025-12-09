import type { EventData, ResponseData, ApiTimeSlot, CreateEventPayload, CreateEventSuccessResponse, EventResponse, TimeSlot, SubmitAvailabilityPayload } from '../types';

// API base URL - adjust as needed for production vs development
// For local development, assume backend is on port 3000 (via proxy)
const API_BASE_URL = '/api';

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
        // Convert UTC to local time for display
        const startDate = new Date(slot.start_at);
        const endDate = new Date(slot.end_at);

        // Extract YYYY-MM-DD
        const dateStr = startDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

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

  submitResponse: async (publicToken: string, responseData: ResponseData): Promise<void> => {
    const payload: SubmitAvailabilityPayload = {
      participant_name: responseData.name,
      time_slot_ids: responseData.slots.map(id => parseInt(id, 10)), // Convert string IDs to numbers
    };

    const apiResponse = await fetch(`${API_BASE_URL}/events/${publicToken}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorDetail = await apiResponse.json();
      throw new Error(errorDetail.message || `Failed to submit response: ${apiResponse.statusText}`);
    }
  },

  // This function is currently not implemented and still relies on mock data.
  // We need to implement getEventResults with API call later.
  getEventResults: async (publicToken: string): Promise<{ event: EventData, responses: ResponseData[] } | null> => {
    console.warn('Using mock for getEventResults');
    return null; 
  }
};

