import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import TimeSlotSelector from './TimeSlotSelector';
import type { TimeSlot } from '../types';

export default function CreateEventForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    // TODO: Replace with actual API call
    console.log('Creating event with:', {
      title,
      description,
      timeSlots: selectedSlots,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    alert(`Event created!\nTitle: ${title}\nSlots: ${selectedSlots.length}`);
    setIsSubmitting(false);
  };

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