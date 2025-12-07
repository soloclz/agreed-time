import type { EventData, ResponseData, TimeSlot, EventCreationResult } from '../types';

// MOCK DATA
const MOCK_EVENT_DATA: EventData = {
  id: 'mock-event-id',
  title: 'My Event Title',
  description: 'Help us find the perfect time that works for everyone.',
  slotDuration: 60,
  availableSlots: [
    { id: '1', date: '2025-12-08', startTime: '09:00', endTime: '10:00' },
    { id: '2', date: '2025-12-08', startTime: '10:00', endTime: '11:00' },
    { id: '3', date: '2025-12-08', startTime: '11:00', endTime: '12:00' },
    { id: '4', date: '2025-12-09', startTime: '13:00', endTime: '14:00' },
    { id: '5', date: '2025-12-09', startTime: '14:00', endTime: '15:00' },
    { id: '6', date: '2025-12-10', startTime: '17:00', endTime: '18:00' },
    { id: '7', date: '2025-12-11', startTime: '09:00', endTime: '10:00' },
    { id: '8', date: '2025-12-11', startTime: '10:00', endTime: '11:00' },
    { id: '9', date: '2025-12-11', startTime: '11:00', endTime: '12:00' },
  ]
};

const MOCK_RESPONSES: ResponseData[] = [
  { name: 'Alice', slots: ['2025-12-08T01:00:00.000Z', '2025-12-08T02:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Prefer earlier' },
  { name: 'Bob', slots: ['2025-12-08T02:00:00.000Z', '2025-12-09T05:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Only Tuesdays' },
  { name: 'Charlie', slots: ['2025-12-08T03:00:00.000Z', '2025-12-10T09:00:00.000Z'], comment: 'Wednesdays are best' },
  { name: 'David', slots: ['2025-12-09T05:00:00.000Z', '2025-12-11T01:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
  { name: 'Eve', slots: ['2025-12-10T09:00:00.000Z', '2025-12-11T01:00:00.000Z', '2025-12-12T02:00:00.000Z'], comment: 'Flexible!' },
  { name: 'Frank', slots: ['2025-12-08T01:00:00.000Z', '2025-12-12T02:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
  { name: 'Grace', slots: ['2025-12-09T05:00:00.000Z', '2025-12-11T01:00:00.000Z', '2025-12-10T09:00:00.000Z'] },
];

// In-memory store for created events (simulates DB for the session)
const eventsStore: Record<string, EventData> = {
  [MOCK_EVENT_DATA.id]: MOCK_EVENT_DATA
};

const responsesStore: Record<string, ResponseData[]> = {
  [MOCK_EVENT_DATA.id]: MOCK_RESPONSES
};

// Simulates network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const eventService = {
  getEvent: async (id: string): Promise<EventData | null> => {
    await delay(500);
    return eventsStore[id] || null;
  },

  createEvent: async (title: string, description: string, availableSlots: TimeSlot[]): Promise<EventCreationResult> => {
    await delay(1000);
    
    const newEventId = Math.random().toString(36).substring(2, 15);
    const newAdminToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const newSecureCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newEvent: EventData = {
      id: newEventId,
      title,
      description,
      availableSlots,
      slotDuration: 60 // Default for now
    };

    eventsStore[newEventId] = newEvent;
    responsesStore[newEventId] = []; // Initialize empty responses

    return {
      eventId: newEventId,
      adminToken: newAdminToken,
      secureCode: newSecureCode,
      eventTitle: title,
    };
  },

  submitResponse: async (eventId: string, response: ResponseData): Promise<void> => {
    await delay(800);
    if (!responsesStore[eventId]) {
        responsesStore[eventId] = [];
    }
    responsesStore[eventId].push(response);
  },

  getEventResults: async (eventId: string): Promise<{ event: EventData, responses: ResponseData[] } | null> => {
    await delay(800);
    const event = eventsStore[eventId];
    if (!event) return null;
    
    return {
      event,
      responses: responsesStore[eventId] || []
    };
  }
};
