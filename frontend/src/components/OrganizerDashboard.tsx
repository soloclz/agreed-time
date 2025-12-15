import { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // Import toast
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
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State for confirmation modal
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
        toast.error(`Failed to load event: ${err.message}`); // Use toast for error
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerEvent();
  }, [organizerToken]);

  const confirmCloseEvent = async () => {
    setShowConfirmModal(false); // Close modal
    if (!organizerData) return;

    setIsClosing(true);
    try {
      await eventService.closeEvent(organizerToken);
      const updatedData = await eventService.getOrganizerEvent(organizerToken);
      if (updatedData) {
        setOrganizerData(updatedData);
      }
      toast.success('Event has been closed successfully!');
    } catch (err: any) {
      setError(`Failed to close event: ${err.message}`);
      toast.error(`Failed to close event: ${err.message}`); // Use toast for error
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
    <div className="space-y-8">
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
                  {organizerData.created_at && (
                    <p className="text-xs text-ink/50 mt-2 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This event will expire on {new Date(new Date(organizerData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (7 days after creation)
                    </p>
                  )}
              </div>
              
              {organizerData.state === 'open' && (
                <button
                  onClick={() => setShowConfirmModal(true)} // Open modal on click
                  disabled={isClosing}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded shadow hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isClosing ? 'Closing...' : 'Close Event'}
                </button>
              )}
          </div>

         <div className="space-y-6 pt-4">
             {/* Primary: Participant Link */}
             <div className="flex flex-col gap-2">
                <div className="text-base font-bold text-ink flex items-center gap-2">
                   Invite Participants
                   <span className="text-xs font-normal bg-film-accent/10 text-film-accent px-2 py-0.5 rounded-full border border-film-accent/20">
                     Share this link
                   </span>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                       navigator.clipboard.writeText(publicEventUrl);
                       toast.success('Participant link copied!');
                     }} 
                     className="bg-film-accent hover:bg-film-accent-hover text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all active:scale-95 text-lg flex-grow sm:flex-grow-0"
                   >
                     Copy Participant Link
                   </button>
                   <span className="text-sm text-ink/50 font-mono hidden sm:block">({publicEventDisplayUrl})</span>
                </div>
                <p className="text-sm text-ink/60">
                   Share this capability link with participants so they can view the event and submit availability.
                </p>
             </div>

             {/* Secondary: Results Link */}
             <div className="flex flex-col gap-1 pt-4">
                <span className="text-xs font-bold text-ink/40 uppercase tracking-wider">Advanced: Read-only Results Link</span>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                        navigator.clipboard.writeText(publicResultsUrl);
                        toast.success('Results link copied!'); // Use toast
                     }} 
                     className="text-sm bg-white border border-film-border hover:bg-gray-50 px-4 py-2 rounded text-ink/70 font-medium transition-colors shadow-sm"
                   >
                     Copy Result Link
                   </button>
                   <span className="text-xs text-ink/50 font-mono hidden sm:block">({publicResultsDisplayUrl})</span>
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

       {/* Confirmation Modal for closing event */}
       {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-bold text-ink font-serif">Confirm Close Event</h3>
            <p className="text-ink/80 text-sm">
              Are you sure you want to close this event "{organizerData.title}"?
              Participants will no longer be able to submit or update their availability.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCloseEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Close Event
              </button>
            </div>
          </div>
        </div>
       )}
    </div>
  );
}
