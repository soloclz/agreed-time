import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import TimeSlotSelector from './TimeSlotSelector';
import type { ApiTimeRange } from '../types';
import { eventService } from '../services/eventService';

export default function CreateEventForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('Organizer');
  const [selectedRanges, setSelectedRanges] = useState<ApiTimeRange[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const SLOT_DURATION = 60; // Default for now, could be selectable in future

  const handleRangesChange = useCallback((ranges: ApiTimeRange[]) => {
    setSelectedRanges(ranges);
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
      toast.error('Please enter a title for your event');
      return;
    }

    if (selectedRanges.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user's current timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const result = await eventService.createEvent(
        title,
        description,
        organizerName.trim() === '' ? "Organizer" : organizerName, // Frontend ensures non-empty value
        userTimeZone,
        SLOT_DURATION,
        selectedRanges
      );
      
      // Save admin token to localStorage for auto-login
      try {
        localStorage.setItem(`agreed_time_admin_${result.id}`, result.organizer_token);
      } catch (error) {
        console.error('Failed to save admin token to localStorage:', error);
      }

      toast.success('Event created successfully!');
      // Direct redirect to manage page
      window.location.replace(`/manage/${result.organizer_token}`);

    } catch (error) {
      console.error("Event creation failed:", error);
      toast.error('Failed to create event. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {/* Event Details Section */}
      <div className="space-y-4 sm:space-y-6">

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ink mb-2 font-serif relative">
            Event Title <span className="text-red-500">*</span>
            <span className="absolute top-0 right-0 text-sm text-gray-500">{title.length}/50</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Team Sync Meeting"
            className="w-full px-4 py-3 border-b border-film-border bg-film-light/50 focus:bg-film-light focus:outline-none focus:border-film-accent transition-colors font-mono rounded-t-sm placeholder-gray-400 text-ink"
            required
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink mb-2 font-serif relative">
            Description (optional)
            <span className="absolute top-0 right-0 text-sm text-gray-500">{description.length}/500</span>
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
            className="w-full px-4 py-3 border-b border-film-border bg-film-light/50 focus:bg-film-light focus:outline-none focus:border-film-accent transition-colors font-mono resize-none rounded-t-sm placeholder-gray-400 text-ink overflow-hidden"
            maxLength={500}
          />
        </div>

        <div>
          <label htmlFor="organizerName" className="block text-sm font-medium text-ink mb-2 font-serif relative">
            Your name (optional)
            <span className="absolute top-0 right-0 text-sm text-gray-500">{organizerName.length}/50</span>
          </label>
          <input
            id="organizerName"
            name="organizerName"
            type="text"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="Organizer"
            className="w-full px-4 py-3 border-b border-film-border bg-film-light/50 focus:bg-film-light focus:outline-none focus:border-film-accent transition-colors font-mono rounded-t-sm placeholder-gray-400 text-ink"
            autoComplete="name"
            maxLength={50}
          />
        </div>
      </div>

      {/* Time Slot Selector */}
      <div>
        <TimeSlotSelector 
          slotDuration={SLOT_DURATION}
          onRangesChange={handleRangesChange} 
        />
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 py-4 sm:py-6 border-t border-film-border pb-20 sm:pb-6">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || selectedRanges.length === 0}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-film-accent text-white font-sans font-medium tracking-wide hover:bg-film-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 rounded-lg shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
        >
          {isSubmitting ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
