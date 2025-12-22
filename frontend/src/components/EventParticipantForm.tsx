import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ApiTimeRange, EventData } from '../types';
import TimeSlotSelector from './TimeSlotSelector';
import { eventService, ApiError } from '../services/eventService';

export default function EventParticipantForm({ publicToken }: { publicToken: string }) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantComment, setParticipantComment] = useState('');
  const [selectedParticipantRanges, setSelectedParticipantRanges] = useState<ApiTimeRange[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submit lock
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [loadedDraftRanges, setLoadedDraftRanges] = useState<ApiTimeRange[]>([]);
  const [participantToken, setParticipantToken] = useState<string | null>(null);

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
          
          // 1. Check for existing participant token (Edit Mode)
          let foundExisting = false;
          try {
            const historyKey = `agreed_time_guest_${publicToken}`;
            const historyStr = localStorage.getItem(historyKey);
            if (historyStr) {
              const historyData = JSON.parse(historyStr);
              if (historyData.token === publicToken && historyData.participant_token) {
                 // Found a token, try to fetch participant data
                 const pToken = historyData.participant_token;
                 try {
                   const participantData = await eventService.getParticipant(publicToken, pToken);
                   if (participantData) {
                     setParticipantToken(pToken);
                     setParticipantName(participantData.name);
                     setParticipantComment(participantData.comment || '');
                     setSelectedParticipantRanges(participantData.availabilities);
                     setLoadedDraftRanges(participantData.availabilities);
                     foundExisting = true;
                     toast('Loaded your previous response', { icon: '✏️' });
                   }
                 } catch (fetchErr) {
                   console.error('Failed to fetch existing participant', fetchErr);
                   // If fetch fails (e.g. wiped from DB), ignore and fall back to draft
                 }
              }
            }
          } catch (e) {
            console.error('Failed to check history', e);
          }

          // 2. Load draft if no existing participant found
          if (!foundExisting) {
            try {
              const savedDraft = sessionStorage.getItem(`participant_draft_${publicToken}`);
              if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                if (parsed.name) setParticipantName(parsed.name);
                if (parsed.comment) setParticipantComment(parsed.comment);
                if (parsed.selectedRanges && Array.isArray(parsed.selectedRanges)) {
                  setSelectedParticipantRanges(parsed.selectedRanges);
                  setLoadedDraftRanges(parsed.selectedRanges);
                }
                toast('Restored your draft', { icon: '📝' });
              }
            } catch (e) {
              console.error('Failed to load participant draft', e);
            }
          }
          setDraftLoaded(true);

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

  // Save draft to sessionStorage whenever fields change
  // Only save draft if we are NOT in edit mode (or maybe we should? let's keep it simple)
  // Actually, even in edit mode, draft protection is good against refresh.
  useEffect(() => {
    if (!draftLoaded) return;

    const draft = {
      name: participantName,
      comment: participantComment,
      selectedRanges: selectedParticipantRanges
    };
    sessionStorage.setItem(`participant_draft_${publicToken}`, JSON.stringify(draft));
  }, [participantName, participantComment, selectedParticipantRanges, draftLoaded, publicToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    if (!participantName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (selectedParticipantRanges.length === 0) {
      toast.error('Please select at least one time slot.');
      return;
    }

    setIsSubmitting(true); // Lock the form
    try {
      let currentToken = participantToken;

      if (currentToken) {
        // Update existing
        await eventService.updateParticipant(
          publicToken,
          currentToken,
          participantName,
          selectedParticipantRanges,
          participantComment
        );
        toast.success('Your availability has been updated!');
      } else {
        // Create new
        const response = await eventService.submitResponse(
          publicToken,
          participantName,
          selectedParticipantRanges,
          participantComment
        );
        currentToken = response.participant_token;
        setParticipantToken(currentToken);
        toast.success('Your availability has been submitted!');
      }
      
      setSubmitted(true);

      // Save to history as a guest (Responded) with participant_token
      if (eventData && currentToken) {
        try {
          const historyData = {
            public_token: publicToken,
            participant_token: currentToken,
            title: eventData.title,
            created_at: Date.now()
          };
          localStorage.setItem(`agreed_time_guest_${publicToken}`, JSON.stringify(historyData));
          // Clear draft
          sessionStorage.removeItem(`participant_draft_${publicToken}`);
        } catch (e) {
          console.error('Failed to save history', e);
        }
      }

    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'PARTICIPANT_LIMIT_REACHED') {
         toast.error('This event has reached the maximum number of participants (10).');
      } else {
         toast.error(err.message || 'Failed to submit response.');
      }
    } finally {
      setIsSubmitting(false); // Unlock the form
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

      <div className="space-y-4 relative">
        <label htmlFor="participantName" className="block text-lg font-bold text-ink">Your Name <span className="text-red-500">*</span></label>
        <span className="absolute top-0 right-0 text-sm text-gray-500 mt-1 mr-1">{participantName.length}/50</span>
        <input
          type="text"
          id="participantName"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          placeholder="Enter your name"
          required
          maxLength={50} // Added maxLength
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        />
      </div>

      <div className="space-y-4 relative">
        <label htmlFor="participantComment" className="block text-lg font-bold text-ink">Comments (Optional)</label>
        <span className="absolute top-0 right-0 text-sm text-gray-500 mt-1 mr-1">{participantComment.length}/500</span>
        <textarea
          id="participantComment"
          value={participantComment}
          onChange={(e) => setParticipantComment(e.target.value)}
          placeholder="Any notes or preferences?"
          rows={3}
          maxLength={500} // Added maxLength
          className="w-full px-4 py-3 border border-film-border rounded-lg bg-white text-base focus:outline-none focus:ring-2 focus:ring-film-accent focus:border-film-accent font-sans transition-colors text-ink"
        ></textarea>
      </div>

      <div>
        {eventData && eventData.eventSlots && (
          <TimeSlotSelector
            availableRanges={eventData.eventSlots} // Pass ranges
            slotDuration={eventData.slotDuration}
            onRangesChange={setSelectedParticipantRanges}
            initialRanges={loadedDraftRanges}
          />
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-4 font-sans font-medium tracking-wide transition-colors duration-300 rounded-lg shadow-md text-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none bg-film-accent text-white hover:bg-film-accent-hover hover:shadow-lg"
          disabled={selectedParticipantRanges.length === 0 || !participantName.trim() || isSubmitting} // Updated disabled condition
        >
          {isSubmitting 
            ? (participantToken ? 'Updating...' : 'Submitting...') 
            : (participantToken ? 'Update Availability' : 'Submit Availability')}
        </button>
      </div>
    </form>
  );
}
