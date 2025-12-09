import { useState, useEffect } from 'react';
import type { OrganizerEventResponse } from '../types';
import { eventService } from '../services/eventService';
import { getTimezoneOffsetString } from '../utils/dateUtils';
import EventResultsDisplay from './EventResultsDisplay';

// Helper function to truncate URL for display
const truncateUrl = (url: string, maxLength = 40) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const hostname = urlObj.hostname;

    // Prioritize showing full hostname + relevant part of token
    const pathSegments = path.split('/');
    if (pathSegments.length >= 3 && (pathSegments[1] === 'event' || pathSegments[1] === 'manage')) {
        const token = pathSegments[pathSegments.length - 1];
        if (token.length > 8) { // if token is long, show start...end
            const start = token.substring(0, 4);
            const end = token.substring(token.length - 4);
            return `${hostname}${pathSegments.slice(0, -1).join('/')}/${start}...${end}`;
        }
    }
    // Fallback to general truncation if path not typical or token short
    if (url.length <= maxLength) return url;
    return `${hostname}${path.substring(0, maxLength - hostname.length - 5)}...`;
};


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

  // Truncated URLs for display
  const publicEventDisplayUrl = truncateUrl(publicEventUrl);
  const publicResultsDisplayUrl = truncateUrl(publicResultsUrl);

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

          <div className="space-y-6 pt-4">
             {/* Primary: Invitation Link */}
             <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-ink flex items-center gap-2">
                   Invite Participants
                   <span className="text-xs font-normal bg-film-accent/10 text-film-accent px-2 py-0.5 rounded-full border border-film-accent/20">
                     Share this link
                   </span>
                </label>
                <div className="flex gap-2">
                   <input 
                     readOnly 
                     value={publicEventDisplayUrl} 
                     className="flex-1 text-base p-3 border-2 border-film-accent/30 focus:border-film-accent rounded-lg bg-paper text-ink font-mono shadow-sm transition-colors"
                     onClick={(e) => e.currentTarget.select()}
                   />
                   <button 
                     onClick={() => {
                       navigator.clipboard.writeText(publicEventUrl);
                       alert('Link copied!');
                     }} 
                     className="bg-film-accent hover:bg-film-accent-hover text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all active:scale-95"
                   >
                     Copy
                   </button>
                </div>
                <p className="text-sm text-ink/60">
                   Send this link to anyone you want to invite. They can view the event details and select their available times.
                </p>
             </div>

             {/* Secondary: Results Link */}
             <div className="flex flex-col gap-1 pt-2">
                <span className="text-xs font-bold text-ink/40 uppercase tracking-wider">Advanced: Read-only Results Link</span>
                <div className="flex gap-2 items-center">
                   <input 
                     readOnly 
                     value={publicResultsDisplayUrl} 
                     className="flex-1 text-xs p-2 border border-film-border rounded bg-gray-50 text-ink/50 font-mono focus:outline-none focus:border-film-border" 
                     onClick={(e) => e.currentTarget.select()}
                   />
                   <button 
                     onClick={() => {
                        navigator.clipboard.writeText(publicResultsUrl);
                        alert('Results link copied!');
                     }} 
                     className="text-xs bg-white border border-film-border hover:bg-gray-50 px-3 py-2 rounded text-ink/60 font-medium transition-colors"
                   >
                     Copy Result Link
                   </button>
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

