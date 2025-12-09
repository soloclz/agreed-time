import { useState, useEffect } from 'react';
import type { OrganizerEventResponse } from '../types';
import { eventService } from '../services/eventService';

interface OrganizerDashboardProps {
  organizerToken: string;
}

export default function OrganizerDashboard({ organizerToken }: OrganizerDashboardProps) {
  const [organizerData, setOrganizerData] = useState<OrganizerEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false); // State for close button loading

  useEffect(() => {
    const fetchOrganizerEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await eventService.getOrganizerEvent(organizerToken);
        if (data) {
          setOrganizerData(data);
        } else {
          setError('Organizer event not found.');
        }
      } catch (err: any) {
        setError(`Failed to load organizer event data: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerEvent();
  }, [organizerToken]);

  const handleCloseEvent = async () => {
    if (!organizerData || organizerData.state === 'closed') return;

    if (!confirm('Are you sure you want to close this event? Participants will no longer be able to submit availability.')) {
      return;
    }

    setIsClosing(true);
    try {
      // The closeEvent service returns an EventResponse, but we need OrganizerEventResponse to re-render.
      // So we refetch the full organizer data.
      await eventService.closeEvent(organizerToken);
      const updatedData = await eventService.getOrganizerEvent(organizerToken);
      if (updatedData) {
        setOrganizerData(updatedData);
      }
      alert('Event has been closed successfully!');
    } catch (err: any) {
      setError(`Failed to close event: ${err.message}`);
      alert(`Failed to close event: ${err.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading organizer dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (!organizerData) {
    return <div className="text-center py-12 text-gray-500">No event data for this organizer token.</div>;
  }

  // Construct public URL
  const publicEventUrl = `${window.location.origin}/event/${organizerData.public_token}`;
  const publicResultsUrl = `${window.location.origin}/event/${organizerData.public_token}/result`;

  return (
    <div className="space-y-6 sm:space-y-8 bg-paper p-6 rounded-lg shadow-md">
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink mb-2">
        {organizerData.title}
      </h1>
      <p className="text-ink/80 text-lg">{organizerData.description || 'No description provided.'}</p>

      <div className="flex items-center space-x-2">
        <span className="font-bold text-ink">Status:</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          organizerData.state === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {organizerData.state.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-ink">Share Links</h2>
        <div className="flex items-center space-x-2">
          <span className="text-ink/80">Public Event:</span>
          <a href={publicEventUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {publicEventUrl}
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(publicEventUrl)}
            className="px-2 py-1 bg-film-accent text-white rounded-md text-sm hover:bg-film-accent-hover"
          >
            Copy
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-ink/80">Public Results:</span>
          <a href={publicResultsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {publicResultsUrl}
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(publicResultsUrl)}
            className="px-2 py-1 bg-film-accent text-white rounded-md text-sm hover:bg-film-accent-hover"
          >
            Copy
          </button>
        </div>
      </div>

      {organizerData.state === 'open' && (
        <div className="mt-6">
          <button
            onClick={handleCloseEvent}
            disabled={isClosing}
            className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
          >
            {isClosing ? 'Closing...' : 'Close Event'}
          </button>
        </div>
      )}

      {/* TODO: Add sections for editing time slots, viewing heatmap, participant list */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-ink">Event Details (TODO: Heatmap, Time Slot Editor)</h2>
        {/* Placeholder for future components */}
        <p>Current State: {organizerData.state}</p>
        <p>Total Participants: {organizerData.total_participants}</p>
      </div>

    </div>
  );
}
