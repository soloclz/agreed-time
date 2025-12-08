import { useState, useEffect } from 'react';
import type { TimeSlot, EventData } from '../types';
import TimeSlotSelector from './TimeSlotSelector';
import { eventService } from '../services/eventService';

export default function EventGuestForm({ eventId }: { eventId: string }) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestComment, setGuestComment] = useState('');
  const [selectedGuestSlots, setSelectedGuestSlots] = useState<TimeSlot[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await eventService.getEvent(eventId);
        if (data) {
          setEventData(data);
        } else {
          setError('Event not found.');
        }
      } catch (err) {
        setError('Failed to load event data.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (selectedGuestSlots.length === 0) {
      alert('Please select at least one time slot.');
      return;
    }

    // Flatten the slot IDs or full slots? ResponseData expects strings (ISO slots potentially?)
    // In EventResultView logic we used `slots` as ISO strings.
    // TimeSlotSelector returns TimeSlot objects.
    // We need to convert TimeSlot objects to the format expected by ResponseData.
    // Based on Heatmap.tsx parsing, it expects ISO strings like "2025-12-08T09:00:00.000Z".
    // But wait, `TimeSlotSelector` uses `TimeSlot` objects internally.
    // Let's check `TimeSlot` definition again: { id: string, date: string, startTime: string, endTime: string }
    // The `id` in TimeSlot usually is the ISO string key in previous implementations or just an ID.
    
    // Let's look at how MOCK_RESPONSES were structured:
    // slots: ['2025-12-08T01:00:00.000Z', ...]
    
    // And TimeSlotSelector's `onSlotsChange` returns `TimeSlot[]`.
    // The `id` property of `TimeSlot` constructed in `TimeSlotSelector` is `key` which is `${date}_${startTime}-${endTime}`.
    // This is NOT an ISO string.
    
    // We need a way to convert the selection back to ISO strings if that's what the "Backend" expects.
    // Or we update the `ResponseData` type to hold `TimeSlot[]` objects instead of string arrays.
    // However, keeping it as strings is usually better for storage.
    
    // Construct ISO strings from TimeSlot:
    // TimeSlot: date="2025-12-08", startTime="09:00"
    // ISO: "2025-12-08T09:00:00.000Z" (assuming UTC context or local handled consistently)
    
    // For the purpose of this refactor, let's map them to ISO strings assuming simpler format or just use the IDs if consistent.
    // Actually, `Heatmap.tsx` uses `parseISO(s.slot)`. So it expects standard ISO strings.
    
    // Correctly convert local TimeSlot objects to ISO 8601 UTC strings
    const slotsAsIsoStrings = selectedGuestSlots.map(slot => {
      // Construct a local date-time string
      const startLocal = `${slot.date}T${slot.startTime}:00`; 
      
      // new Date() will parse this as local time
      const startDate = new Date(startLocal); 
      
      // toISOString() converts it to UTC and returns in ISO 8601 format
      return startDate.toISOString();
    });

    try {
      await eventService.submitResponse(eventId, {
        name: guestName,
        comment: guestComment,
        slots: slotsAsIsoStrings, 
      });
      setSubmitted(true);
    } catch (error) {
      alert('Failed to submit response. Please try again.');
    }
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
