import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ApiTimeRange, EventData } from '../types';
import TimeSlotSelector from './TimeSlotSelector';
import { eventService } from '../services/eventService';

export default function EventParticipantForm({ publicToken }: { publicToken: string }) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantComment, setParticipantComment] = useState('');
  const [selectedParticipantRanges, setSelectedParticipantRanges] = useState<ApiTimeRange[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await eventService.getEvent(publicToken);
        if (data) {
          if (data.state === 'closed') {
            window.location.href = `/event/${publicToken}/result`;
            return;
          }
          setEventData(data);
        } else {
          setError('Event not found.');
        }
      } catch (err: any) {
        setError(`Failed to load event data: ${err.message}`);
        toast.error(`Failed to load event: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [publicToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (selectedParticipantRanges.length === 0) {
      toast.error('Please select at least one time slot.');
      return;
    }

    try {
      await eventService.submitResponse(
        publicToken,
        participantName,
        selectedParticipantRanges,
        participantComment
      );
      setSubmitted(true);
      toast.success('Your availability has been submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit response.');
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
      <div className="text-center py-12 text-film-accent space-y-4">
        <h2 className="text-3xl font-bold font-serif">Thank you!</h2>
        <p className="text-lg">Your availability has been submitted for "{eventData?.title}".</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 bg-paper p-6 rounded-lg shadow-md">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink mb-2">{eventData?.title}</h1>
        <p className="text-ink/80 text-lg">{eventData?.description}</p>
        <p className="text-sm text-gray-500 mt-2">Organizer: {eventData?.organizerName}</p>
      </div>

      <div className="space-y-4">
        <label htmlFor="participantName" className="block text-lg font-bold text-ink">Your Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="participantName"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          placeholder="Enter your name"
          required
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        />
      </div>

      <div className="space-y-4">
        <label htmlFor="participantComment" className="block text-lg font-bold text-ink">Comments (Optional)</label>
        <textarea
          id="participantComment"
          value={participantComment}
          onChange={(e) => setParticipantComment(e.target.value)}
          placeholder="Any notes or preferences?"
          rows={3}
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        ></textarea>
      </div>

      <div>
        {eventData && eventData.eventSlots && (
          <TimeSlotSelector
            availableRanges={eventData.eventSlots} // Pass ranges
            slotDuration={eventData.slotDuration}
            onRangesChange={setSelectedParticipantRanges}
          />
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-4 font-sans font-medium tracking-wide transition-colors duration-300 rounded-lg shadow-md text-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none bg-film-accent text-white hover:bg-film-accent-hover hover:shadow-lg"
          disabled={selectedParticipantRanges.length === 0 || !participantName.trim()}
        >
          Submit Availability
        </button>
      </div>
    </form>
  );
}
