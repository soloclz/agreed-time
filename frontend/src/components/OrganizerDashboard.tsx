import { useState, useEffect } from 'react';
import type { OrganizerEventResponse } from '../types';
import { eventService } from '../services/eventService';
import { getTimezoneOffsetString } from '../utils/dateUtils';
import EventResultsDisplay from './EventResultsDisplay';

interface OrganizerDashboardProps {
  organizerToken: string;
}

export default function OrganizerDashboard({ organizerToken }: OrganizerDashboardProps) {
  const [organizerData, setOrganizerData] = useState<OrganizerEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [timezoneOffsetString, setTimezoneOffsetString] = useState<string>('');

  useEffect(() => {
    setTimezoneOffsetString(getTimezoneOffsetString());

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

  const publicEventUrl = `${window.location.origin}/event/${organizerData.public_token}`;
  const publicResultsUrl = `${window.location.origin}/event/${organizerData.public_token}/result`;

  return (
    <div className="space-y-8 bg-paper p-4 sm:p-6 rounded-lg shadow-md">
       {/* Admin Controls Section */}
       <div className="bg-white border-l-4 border-film-accent p-4 sm:p-6 shadow-sm rounded-r-lg space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                    Organizer Dashboard
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase border ${
                      organizerData.state === 'open' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {organizerData.state}
                    </span>
                  </h2>
                  <p className="text-sm text-ink/60 mt-1">
                    Manage your event and view results below.
                  </p>
              </div>
              
              {organizerData.state === 'open' && (
                <button
                  onClick={handleCloseEvent}
                  disabled={isClosing}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isClosing ? 'Closing...' : 'Close Event'}
                </button>
              )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
             <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-ink/50 uppercase tracking-wider">Public Guest Link</span>
                <div className="flex gap-2">
                   <input readOnly value={publicEventUrl} className="flex-1 text-sm p-2 border border-film-border rounded bg-paper text-ink/70 font-mono" />
                   <button onClick={() => navigator.clipboard.writeText(publicEventUrl)} className="text-sm bg-film-border/50 hover:bg-film-border px-3 py-1 rounded text-ink font-medium transition-colors">Copy</button>
                </div>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-ink/50 uppercase tracking-wider">Public Results Link</span>
                <div className="flex gap-2">
                   <input readOnly value={publicResultsUrl} className="flex-1 text-sm p-2 border border-film-border rounded bg-paper text-ink/70 font-mono" />
                   <button onClick={() => navigator.clipboard.writeText(publicResultsUrl)} className="text-sm bg-film-border/50 hover:bg-film-border px-3 py-1 rounded text-ink font-medium transition-colors">Copy</button>
                </div>
             </div>
          </div>
       </div>

       <hr className="border-film-border/50" />

       {/* Shared Result View */}
       <EventResultsDisplay 
          data={organizerData} 
          publicToken={organizerData.public_token} 
          timezoneOffsetString={timezoneOffsetString} 
       />
    </div>
  );
}
