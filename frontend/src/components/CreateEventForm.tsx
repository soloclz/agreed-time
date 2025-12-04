import { useState, useCallback } from 'react';
import TimeSlotSelector from './TimeSlotSelector';
import type { TimeSlot } from '../types';

export default function CreateEventForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSlotsChange = useCallback((slots: TimeSlot[]) => {
    setSelectedSlots(slots);
  }, []);

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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Event Details Section */}
      <div className="space-y-6">
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
            className="w-full px-4 py-3 border-b border-film-border bg-transparent focus:outline-none focus:border-film-accent transition-colors font-mono rounded-none placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink mb-2 font-serif">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any details about the event..."
            rows={3}
            className="w-full px-4 py-3 border-b border-film-border bg-transparent focus:outline-none focus:border-film-accent transition-colors font-mono resize-none rounded-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* Time Slot Selector */}
      <div>
        <TimeSlotSelector onSlotsChange={handleSlotsChange} />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {selectedSlots.length > 0 ? (
            <span>
              ✓ <span className="font-semibold">{selectedSlots.length}</span> time slots selected
            </span>
          ) : (
            <span className="text-gray-400">No time slots selected yet</span>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || selectedSlots.length === 0}
          className="px-8 py-3 bg-ink text-paper font-serif font-bold tracking-wide hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors rounded-sm shadow-sm"
        >
          {isSubmitting ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}
