import { useState, useEffect } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotSelector from './TimeSlotSelector';

interface EventData {
  id: string;
  title: string;
  description: string;
  availableSlots: TimeSlot[];
  slotDuration?: number; // Duration in minutes
}

// MOCK DATA - In a real app, this would come from an API call
const MOCK_EVENT_DATA: EventData = {
  id: 'mock-event-id',
  title: 'Availability',
  description: 'Select your available time slots.',
  slotDuration: 60, // 1 hour slots
  availableSlots: [
    { id: '1', date: '2025-12-08', startTime: '09:00', endTime: '10:00' }, // Monday 9am-10am
    { id: '2', date: '2025-12-08', startTime: '10:00', endTime: '11:00' }, // Monday 10am-11am
    { id: '3', date: '2025-12-08', startTime: '11:00', endTime: '12:00' }, // Monday 11am-12pm
    { id: '4', date: '2025-12-09', startTime: '13:00', endTime: '14:00' }, // Tuesday 1pm-2pm
    { id: '5', date: '2025-12-09', startTime: '14:00', endTime: '15:00' }, // Tuesday 2pm-3pm
    { id: '6', date: '2025-12-10', startTime: '17:00', endTime: '18:00' }, // Wednesday 5pm-6pm
    { id: '7', date: '2025-12-11', startTime: '09:00', endTime: '10:00' }, // Thursday 9am-10am
    { id: '8', date: '2025-12-11', startTime: '10:00', endTime: '11:00' }, // Thursday 10am-11am
    { id: '9', date: '2025-12-11', startTime: '11:00', endTime: '12:00' }, // Thursday 11am-12pm
  ]
};

// Example: 30-minute intervals
const MOCK_EVENT_DATA_30MIN: EventData = {
  id: 'mock-event-30min',
  title: 'Quick Team Sync',
  description: 'Short 30-minute slots for quick discussions.',
  slotDuration: 30,
  availableSlots: [
    { id: '1', date: '2025-12-08', startTime: '09:00', endTime: '09:30' },
    { id: '2', date: '2025-12-08', startTime: '09:30', endTime: '10:00' },
    { id: '3', date: '2025-12-08', startTime: '10:00', endTime: '10:30' },
    { id: '4', date: '2025-12-08', startTime: '14:00', endTime: '14:30' },
    { id: '5', date: '2025-12-09', startTime: '15:00', endTime: '15:30' },
  ]
};

// Example: Half-day intervals (4 hours)
const MOCK_EVENT_DATA_HALF_DAY: EventData = {
  id: 'mock-event-half-day',
  title: 'Workshop Session',
  description: 'Half-day workshop slots.',
  slotDuration: 240, // 4 hours
  availableSlots: [
    { id: '1', date: '2025-12-08', startTime: '09:00', endTime: '13:00' }, // Morning
    { id: '2', date: '2025-12-08', startTime: '13:00', endTime: '17:00' }, // Afternoon
    { id: '3', date: '2025-12-09', startTime: '09:00', endTime: '13:00' },
    { id: '4', date: '2025-12-10', startTime: '13:00', endTime: '17:00' },
  ]
};

export default function EventGuestForm({ eventId }: { eventId: string }) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestComment, setGuestComment] = useState('');
  const [selectedGuestSlots, setSelectedGuestSlots] = useState<TimeSlot[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Simulate fetching event data from an API
    setLoading(true);
    setError(null);
    setTimeout(() => {
      let data: EventData | null = null;

      if (eventId === MOCK_EVENT_DATA.id) {
        data = MOCK_EVENT_DATA;
      } else if (eventId === MOCK_EVENT_DATA_30MIN.id) {
        data = MOCK_EVENT_DATA_30MIN;
      } else if (eventId === MOCK_EVENT_DATA_HALF_DAY.id) {
        data = MOCK_EVENT_DATA_HALF_DAY;
      }

      if (data) {
        setEventData(data);
        setLoading(false);
      } else {
        setError('Event not found.');
        setLoading(false);
      }
    }, 1000); // Simulate network delay
  }, [eventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (selectedGuestSlots.length === 0) {
      alert('Please select at least one time slot.');
      return;
    }

    console.log('Submitting guest availability:', {
      eventId: eventData?.id,
      guestName,
      guestComment,
      selectedSlots: selectedGuestSlots,
    });

    // Simulate API submission
    setSubmitted(true);
    // In a real app, you'd send this to a backend API
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading event details...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (submitted) {
    return (
      <div className="text-center py-12 text-green-600 space-y-4">
        <h2 className="text-3xl font-bold font-serif">Thank you!</h2>
        <p className="text-lg">Your availability has been submitted for "{eventData?.title}".</p>
        <p className="text-sm text-gray-500">Event ID: {eventId}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 bg-paper p-6 rounded-lg shadow-md">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink mb-2">{eventData?.title}</h1>
        <p className="text-ink/80 text-lg">{eventData?.description}</p>
      </div>

      <div className="space-y-4">
        <label htmlFor="guestName" className="block text-lg font-bold text-ink">Your Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="guestName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Enter your name"
          required
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        />
      </div>

      <div className="space-y-4">
        <label htmlFor="guestComment" className="block text-lg font-bold text-ink">Comments (Optional)</label>
        <textarea
          id="guestComment"
          value={guestComment}
          onChange={(e) => setGuestComment(e.target.value)}
          placeholder="Any notes or preferences?"
          rows={3}
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        ></textarea>
      </div>

      <div>
        {eventData && eventData.availableSlots && (
          <TimeSlotSelector
            availableSlots={eventData.availableSlots}
            slotDuration={eventData.slotDuration}
            onSlotsChange={setSelectedGuestSlots}
            // Add initialSlots if we want to pre-fill based on a previous submission
          />
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-4 font-sans font-medium tracking-wide transition-colors duration-300 rounded-lg shadow-md text-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none bg-film-accent text-white hover:bg-film-accent-hover hover:shadow-lg"
          disabled={selectedGuestSlots.length === 0 || !guestName.trim()}
        >
          Submit Availability
        </button>
      </div>
    </form>
  );
}