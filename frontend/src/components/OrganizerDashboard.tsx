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
  const manageLink = window.location.href; // The current page is the manage page

  return (
    <div className="space-y-8">
       {/* 1. Manage Link Warning (Top Priority) */}
       <div className="bg-amber-50 border-l-4 border-amber-500 p-4 sm:p-6 shadow-sm rounded-r-lg">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
              Private Manage Link
            </h3>
            <p className="text-amber-700 text-sm">
              <strong>Do not share this page!</strong> This is your private dashboard to manage the event. 
              Please <strong>bookmark this page</strong> or save the link below to return later.
            </p>
            <div className="flex items-center gap-2 mt-2 bg-white/50 p-2 rounded border border-amber-200">
               <input 
                 type="text" 
                 readOnly 
                 value={manageLink} 
                 className="flex-grow bg-transparent text-sm text-amber-900 font-mono focus:outline-none truncate"
                 onClick={(e) => e.currentTarget.select()}
               />
               <button
                 onClick={() => {
                    navigator.clipboard.writeText(manageLink);
                    toast.success('Manage link copied! Keep it safe.');
                 }}
                 className="text-xs font-bold text-amber-800 hover:text-amber-900 uppercase tracking-wide px-2"
               >
                 Copy
               </button>
            </div>
          </div>
       </div>

       {/* 2. Main Dashboard Controls */}
       <div className="bg-white border-l-4 border-film-accent p-4 sm:p-6 shadow-sm rounded-r-lg space-y-8">
          {/* Header & Close Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-film-border/20 pb-6">
              <div>
                  <h2 className="text-2xl font-bold text-ink flex items-center gap-3">
                    {organizerData.title}
                    <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium uppercase border ${
                      organizerData.state === 'open'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {organizerData.state}
                    </span>
                  </h2>
                  {organizerData.created_at && (
                    <p className="text-sm text-ink/50 mt-1 flex items-center gap-1">
                      Expires on {new Date(new Date(organizerData.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
              </div>
              
              {organizerData.state === 'open' && (
                <button
                  onClick={() => setShowConfirmModal(true)} // Open modal on click
                  disabled={isClosing}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded shadow-sm hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {isClosing ? 'Closing...' : 'Close Event'}
                </button>
              )}
          </div>

         <div className="space-y-8">
             {/* Primary: Invitation Link */}
             <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-bold text-ink">Invite Participants</h3>
                    <span className="text-sm text-film-accent font-medium">Step 1</span>
                </div>
                <div className="bg-film-light/30 p-4 rounded-lg border border-film-border/50 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                   <div className="flex-grow">
                      <p className="text-sm text-ink/70 mb-2">Share this <strong>Invitation Link</strong> with others to vote:</p>
                   </div>
                   <button 
                     onClick={() => {
                       navigator.clipboard.writeText(publicEventUrl);
                       toast.success('Invitation link copied!');
                     }} 
                     className="bg-film-accent hover:bg-film-accent-hover text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all active:scale-95 text-base whitespace-nowrap flex items-center justify-center gap-2"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
                     </svg>
                     Copy Invitation Link
                   </button>
                </div>
             </div>

             {/* Secondary: Results Link */}
             <div className="border-t border-film-border/30 pt-6">
                <details className="group">
                  <summary className="flex items-center cursor-pointer text-sm text-ink/60 hover:text-ink font-medium select-none list-none">
                     <span className="mr-2 group-open:rotate-90 transition-transform">▶</span>
                     Show Advanced Sharing Options
                  </summary>
                  <div className="mt-4 pl-4 border-l-2 border-film-border/20 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-ink" aria-label="Read-only results link">
                          Read-Only Results Link
                        </h4>
                        <p className="text-xs text-ink/60 mb-2">Use this if you want to share the results without allowing people to vote or modify entries.</p>
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => {
                                navigator.clipboard.writeText(publicResultsUrl);
                                toast.success('Results link copied!');
                             }} 
                             className="text-xs border border-film-border hover:bg-gray-50 px-3 py-1.5 rounded text-ink/70 font-medium transition-colors"
                           >
                             Copy Link
                           </button>
                        </div>
                      </div>
                  </div>
                </details>
             </div>
          </div>
       </div>

       <div className="flex items-baseline justify-between px-2">
            <h3 className="text-xl font-bold text-ink font-serif">Current Results</h3>
            <span className="text-sm text-film-accent font-medium">Step 2</span>
       </div>

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
