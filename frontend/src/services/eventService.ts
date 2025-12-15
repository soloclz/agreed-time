import type { 
    EventData, 
    ApiTimeRange, 
    CreateEventPayload, 
    CreateEventSuccessResponse, 
    EventResponse, 
    SubmitAvailabilityPayload, 
    EventResultsResponse,
    OrganizerEventResponse 
  } from '../types';
  
  // API base URL - adjust as needed for production vs development
  const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || '/api';
  
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
  
        return {
          id: eventResponse.id,
          title: eventResponse.title,
          description: eventResponse.description || '',
          eventSlots: eventResponse.event_slots, 
          slotDuration: eventResponse.slot_duration, // Use backend value
          timeZone: eventResponse.time_zone,
          state: eventResponse.state,
          organizerName: eventResponse.organizer_name,
        };
  
      } catch (error) {
        console.error("Error fetching event:", error);
        return null;
      }
    },
  
    createEvent: async (
      title: string,
      description: string | undefined,
      organizerName: string | undefined,
      timeZone: string | undefined,
      slotDuration: number | undefined,
      timeSlots: ApiTimeRange[]
    ): Promise<CreateEventSuccessResponse> => {
      const payload: CreateEventPayload = {
        title,
        description: description || undefined,
        organizer_name: organizerName || '',
        time_zone: timeZone || undefined,
        slot_duration: slotDuration || 60,
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
        const text = await response.text();
        console.error('Create event failed:', response.status, text);
        try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || errorData.message || 'Failed to create event');
        } catch (e: any) {
             // If the error we just threw is ours, rethrow it.
             if (e.message && e.message !== 'Failed to create event' && !e.message.startsWith('Unexpected token')) {
                 throw e;
             }
            throw new Error(`Failed to create event: ${response.status} ${response.statusText}`);
        }
      }
  
      return response.json() as Promise<CreateEventSuccessResponse>;
    },
  
    submitResponse: async (publicToken: string, participantName: string, ranges: ApiTimeRange[], comment: string | undefined): Promise<void> => {
      const payload: SubmitAvailabilityPayload = {
        participant_name: participantName,
        availabilities: ranges,
        comment: comment || undefined,
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
        // Backend returns { "error": "message" }
        throw new Error(errorDetail.error || errorDetail.message || `Failed to submit response: ${apiResponse.statusText}`);
      }
    },
  
    // Fetch detailed event results with participant information
    getEventResults: async (publicToken: string): Promise<EventResultsResponse | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/events/${publicToken}/results`);
  
        if (response.status === 404) {
          return null;
        }
  
        if (!response.ok) {
          throw new Error(`Failed to fetch event results: ${response.statusText}`);
        }
  
        const data: EventResultsResponse = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching event results:", error);
        return null;
      }
    },
  
    getOrganizerEvent: async (organizerToken: string): Promise<OrganizerEventResponse | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/events/organizer/${organizerToken}`);
        
        if (response.status === 404) {
          return null;
        }
  
        if (!response.ok) {
          throw new Error(`Failed to fetch organizer event: ${response.statusText}`);
        }
  
        const eventResponse: OrganizerEventResponse = await response.json();
        return eventResponse;
  
      } catch (error) {
        console.error("Error fetching organizer event:", error);
        return null;
      }
    },
  
    closeEvent: async (organizerToken: string): Promise<EventResponse> => {
      const response = await fetch(`${API_BASE_URL}/events/${organizerToken}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        const text = await response.text();
        console.error('Close event failed:', response.status, text);
        try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || errorData.message || 'Failed to close event');
        } catch (e: any) {
             if (e.message && e.message !== 'Failed to close event' && !e.message.startsWith('Unexpected token')) {
                 throw e;
             }
            throw new Error(`Failed to close event: ${response.status} ${response.statusText}`);
        }
      }
      return response.json() as Promise<EventResponse>;
    }
  };
