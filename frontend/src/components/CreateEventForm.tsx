import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import TimeSlotSelector from './TimeSlotSelector';
import type { TimeSlot, ApiTimeSlot, CreateEventSuccessResponse } from '../types'; // Updated imports
import { eventService } from '../services/eventService';

// Reusable Copy Button Component
function CopyButton({ textToCopy, label }: { textToCopy: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 px-3 py-1 bg-film-accent/10 text-film-accent text-sm rounded-md hover:bg-film-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
      disabled={copied}
    >
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  );
}

export default function CreateEventForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]); // Still uses old TimeSlot for selector
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventCreationResult, setEventCreationResult] = useState<CreateEventSuccessResponse | null>(null); // Updated type
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSlotsChange = useCallback((slots: TimeSlot[]) => {
    setSelectedSlots(slots);
  }, []);

  // Auto-resize textarea function
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);

  // Set initial height for placeholder
  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title for your event');
      return;
    }

    if (selectedSlots.length === 0) {
      alert('Please select at least one time slot');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user's current timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Convert old TimeSlot[] format to new ApiTimeSlot[] format (ISO 8601 UTC string)
      const apiTimeSlots: ApiTimeSlot[] = selectedSlots.map(slot => {
        // Construct a local date-time string
        const startLocal = `${slot.date}T${slot.startTime}:00`;
        const endLocal = `${slot.date}T${slot.endTime}:00`;

        // Create Date objects (parsed as local time)
        const startDate = new Date(startLocal);
        const endDate = new Date(endLocal);

        // Convert to ISO 8601 UTC string
        return {
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString()
        };
      });

      const result = await eventService.createEvent(
        title,
        description,
        userTimeZone, // Pass user's timezone as metadata
        apiTimeSlots
      );
      
      setEventCreationResult(result);
      
      // Save admin token to localStorage for auto-login
      try {
        localStorage.setItem(`agreed_time_admin_${result.id}`, result.organizer_token); // Updated keys
      } catch (error) {
        console.error('Failed to save admin token to localStorage:', error);
      }
    } catch (error) {
      console.error("Event creation failed:", error); // Log actual error
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (eventCreationResult) {
    const guestLink = `${window.location.origin}/event/${eventCreationResult.id}`; // Updated ID field
    const adminLink = `${window.location.origin}/manage/${eventCreationResult.organizer_token}`; // Updated ID and token fields
    const resultLink = `${window.location.origin}/event/${eventCreationResult.id}/result`; // Updated ID field

    return (
      <div className="space-y-8 p-6 bg-paper rounded-lg shadow-md text-ink">
        <h2 className="text-3xl font-serif font-bold text-film-accent text-center mb-4">Event Created Successfully!</h2>
        <p className="text-lg text-center font-sans">
          Your event "<span className="font-bold">{title}</span>" is ready. {/* Use title from state */}
        </p>

        <div className="space-y-6">
          {/* Guest Link */}
          <div className="bg-film-light border border-film-border rounded-lg p-4">
            <p className="font-bold text-ink mb-2 font-serif">Share this link with participants:</p>
            <div className="flex items-center break-all">
              <input type="text" readOnly value={guestLink} className="flex-grow bg-transparent border-none outline-none font-mono text-sm pr-2"/>
              <CopyButton textToCopy={guestLink} />
            </div>
          </div>

          {/* Admin Link (Masked) */}
          <div className="bg-film-light border border-film-border rounded-lg p-4">
            <p className="font-bold text-ink mb-2 font-serif">Your Admin Access:</p>
            <div className="flex items-center">
              <span className="flex-grow text-ink/70 font-mono text-sm pr-2">
                Click "Copy" to get your private management link.
              </span>
              <CopyButton textToCopy={adminLink} label="Copy Admin Link" />
            </div>
            <p className="text-xs text-ink/70 mt-2 font-sans italic">
              This link gives you full control. <span className="font-bold text-red-500">Do not share it.</span>
            </p>
          </div>

          {/* Go to Results Button */}
          <div className="text-center pt-4">
            <a href={resultLink} className="inline-flex items-center px-6 py-3 bg-film-accent text-white font-sans font-medium tracking-wide hover:bg-film-accent-hover transition-colors duration-300 rounded-lg shadow-md hover:shadow-lg">
              Go to Event Results
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {/* Event Details Section */}
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ink mb-2 font-serif">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Team Sync Meeting"
            className="w-full px-4 py-3 border-b border-film-border bg-film-light/50 focus:bg-film-light focus:outline-none focus:border-film-accent transition-all font-mono rounded-t-sm placeholder-gray-400 text-ink"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink mb-2 font-serif">
            Description (optional)
          </label>
          <textarea
            ref={textareaRef}
            id="description"
            name="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              resizeTextarea();
            }}
            placeholder="Add any details about the event..."
            rows={1}
            className="w-full px-4 py-3 border-b border-film-border bg-film-light/50 focus:bg-film-light focus:outline-none focus:border-film-accent transition-all font-mono resize-none rounded-t-sm placeholder-gray-400 text-ink overflow-hidden"
          />
        </div>
      </div>

      {/* Time Slot Selector */}
      <div>
        <TimeSlotSelector onSlotsChange={handleSlotsChange} />
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 py-4 sm:py-6 border-t border-film-border pb-20 sm:pb-6">
        <div className="text-sm sm:text-base font-sans hidden sm:block">
          {selectedSlots.length > 0 ? (
            <span className="text-ink">
              <span className="font-bold">✓</span> <span className="font-semibold">{selectedSlots.length}</span> time slots selected
            </span>
          ) : (
            <span className="text-ink/70">No time slots selected yet</span>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || selectedSlots.length === 0}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-film-accent text-white font-sans font-medium tracking-wide hover:bg-film-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 rounded-lg shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
        >
          {isSubmitting ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}