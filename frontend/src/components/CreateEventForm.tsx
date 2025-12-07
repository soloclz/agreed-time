import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import TimeSlotSelector from './TimeSlotSelector';
import type { TimeSlot } from '../types';

// Helper to generate a simple UUID-like string
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
// Helper to generate a longer, more secure-looking token
const generateAdminToken = () => generateId() + generateId() + generateId();
// Helper to generate a 6-digit alphanumeric secure code
const generateSecureCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

interface EventCreationResult {
  eventId: string;
  adminToken: string;
  secureCode: string;
  eventTitle: string;
}

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
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventCreationResult, setEventCreationResult] = useState<EventCreationResult | null>(null);
  const [showSecureCode, setShowSecureCode] = useState(false);
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

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500)); // Longer delay for effect

    const newEventId = generateId();
    const newAdminToken = generateAdminToken();
    const newSecureCode = generateSecureCode();

    setEventCreationResult({
      eventId: newEventId,
      adminToken: newAdminToken,
      secureCode: newSecureCode,
      eventTitle: title,
    });
    
    setIsSubmitting(false);
  };

  if (eventCreationResult) {
    const guestLink = `${window.location.origin}/event/${eventCreationResult.eventId}`;
    const adminLink = `${window.location.origin}/event/${eventCreationResult.eventId}/manage?token=${eventCreationResult.adminToken}`;
    const resultLink = `${window.location.origin}/event/${eventCreationResult.eventId}/result`;

    return (
      <div className="space-y-8 p-6 bg-paper rounded-lg shadow-md text-ink">
        <h2 className="text-3xl font-serif font-bold text-film-accent text-center mb-4">Event Created Successfully!</h2>
        <p className="text-lg text-center font-sans">
          Your event "<span className="font-bold">{eventCreationResult.eventTitle}</span>" is ready.
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

          {/* Secure Code (Masked with toggle) */}
          <div className="bg-film-light border border-film-border rounded-lg p-4 text-center">
            <p className="font-bold text-ink mb-2 font-serif">Your Recovery Code:</p>
            <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-mono font-bold text-film-accent tracking-widest bg-film-accent/5 py-4 px-6 rounded-lg select-none">
                {showSecureCode ? eventCreationResult.secureCode : '******'}
                </p>
                <button
                    type="button"
                    onClick={() => setShowSecureCode(!showSecureCode)}
                    className="p-3 bg-film-accent/10 text-film-accent rounded-lg hover:bg-film-accent/20 transition-colors"
                    aria-label={showSecureCode ? "Hide secure code" : "Show secure code"}
                >
                    {showSecureCode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98.02A1.5 1.5 0 002.25 5.5v13.75A1.5 1.5 0 003.98 21h16.04A1.5 1.5 0 0022 19.25V5.5a1.5 1.5 0 00-1.73-.78L3.98.02zm0 1.5l1.5-1.5M7.5 10a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )}
                </button>
            </div>
            <p className="text-xs text-ink/70 mt-4 font-sans italic">
              You can use this code to access the admin menu directly from your event page. Please save it.
            </p>
            <CopyButton textToCopy={eventCreationResult.secureCode} label="Copy Code" />
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