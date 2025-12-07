import { useState, useEffect } from 'react';
import type { TimeSlot } from '../types';
import TimeSlotSelector from './TimeSlotSelector';

interface EventData {
  id: string;
  title: string;
  description: string;
  availableSlots: Set<string>;
}

// MOCK DATA - In a real app, this would come from an API call
const MOCK_EVENT_DATA = {
  id: 'mock-event-id',
  title: 'Team Brainstorming Session',
  description: 'Let\'s find the best time for our next big idea. Please select your available slots within the provided window.',
  availableSlots: new Set([
    "2025-12-08_9",  // Monday 9am
    "2025-12-08_10", // Monday 10am
    "2025-12-08_11", // Monday 11am
    "2025-12-09_13", // Tuesday 1pm
    "2025-12-09_14", // Tuesday 2pm
    "2025-12-10_17", // Wednesday 5pm
    "2025-12-11_9",  // Thursday 9am
    "2025-12-11_10", // Thursday 10am
    "2025-12-11_11", // Thursday 11am
  ])
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
      if (eventId === MOCK_EVENT_DATA.id) {
        setEventData(MOCK_EVENT_DATA);
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
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-ink mb-4">Select Your Available Slots</h3>
        {eventData && eventData.availableSlots && (
          <TimeSlotSelector
            availableSlots={eventData.availableSlots}
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