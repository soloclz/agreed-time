import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast'; // Import toast
import type { OrganizerEventResponse } from '../types';
import { eventService } from '../services/eventService';
import { getTimezoneOffsetString } from '../utils/dateUtils';
import EventResultsDisplay from './EventResultsDisplay';

const formatTokenUrlForDisplay = (url: string) => {
  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split('/').filter(Boolean);

    // /event/:token or /event/:token/result
    // /manage/:token
    const isEvent = segments[0] === 'event' && segments.length >= 2;
    const isManage = segments[0] === 'manage' && segments.length >= 2;
    if (isEvent || isManage) {
      const tokenIndex = 1;
      const token = segments[tokenIndex];
      if (token && token.length > 12) {
        segments[tokenIndex] = `${token.slice(0, 4)}...${token.slice(-4)}`;
      }
    }

    return `${urlObj.hostname}/${segments.join('/')}`;
  } catch {
    return url;
  }
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (showConfirmModal) {
      const id = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }

    previouslyFocusedElementRef.current?.focus?.();
    previouslyFocusedElementRef.current = null;
  }, [showConfirmModal]);

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
  const publicEventDisplayUrl = formatTokenUrlForDisplay(publicEventUrl);
  const publicResultsDisplayUrl = formatTokenUrlForDisplay(publicResultsUrl);

  const manageLink = window.location.href; // The current page is the manage page

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (err: any) {
      toast.error(`Failed to copy: ${err?.message ?? String(err)}`);
    }
  };

  const getManageLinkBackupText = () => {
    const lines = [
      'Agreed Time — Private Manage Link',
      '',
      `Event: ${organizerData.title}`,
      `Status: ${organizerData.state}`,
      '',
      `Manage link (PRIVATE): ${manageLink}`,
      `Invitation link: ${publicEventUrl}`,
      `Read-only results link: ${publicResultsUrl}`,
      '',
      'Keep the manage link private. Anyone with it can manage the event.',
    ];

    return `${lines.join('\n')}\n`;
  };

  const downloadManageLinkBackup = () => {
    try {
      const blob = new Blob([getManageLinkBackupText()], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'agreed-time-manage-link.txt';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded.');
    } catch (err: any) {
      toast.error(`Failed to download backup: ${err?.message ?? String(err)}`);
    }
  };

  const saveManageLink = async () => {
    if (!('share' in navigator)) {
      toast('Save is not supported in this browser. Use “Download backup” instead.');
      return;
    }

    try {
      await navigator.share({
        title: 'Agreed Time — Private Manage Link',
        text: `Private manage link for “${organizerData.title}”. Keep it safe:\n${manageLink}`,
        url: manageLink,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // user cancelled
      toast.error(`Failed to open save sheet: ${err?.message ?? String(err)}`);
    }
  };

  const copyManageLink = () => copyToClipboard(manageLink, 'Manage link copied! Keep it safe.');
  const copyInvitationLink = () => copyToClipboard(publicEventUrl, 'Invitation link copied!');
  const copyResultsLink = () => copyToClipboard(publicResultsUrl, 'Results link copied!');

  const openConfirmModal = () => {
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  const handleModalKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeConfirmModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !modalRef.current?.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
              Please <strong>save the private link below</strong> (Notes, password manager, etc.) to return later.
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
                 type="button"
                 onClick={copyManageLink}
                 className="text-xs font-bold text-amber-800 hover:text-amber-900 uppercase tracking-wide px-2"
               >
                 Copy
               </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={saveManageLink}
                className="text-xs border border-amber-300 bg-white/70 hover:bg-white px-3 py-1.5 rounded text-amber-900 font-semibold transition-colors"
              >
                Save…
              </button>
              <button
                type="button"
                onClick={downloadManageLinkBackup}
                className="text-xs border border-amber-300 bg-white/70 hover:bg-white px-3 py-1.5 rounded text-amber-900 font-semibold transition-colors"
              >
                Download backup
              </button>
              <span className="text-xs text-amber-800/70">Keep this link private.</span>
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
                  onClick={openConfirmModal} // Open modal on click
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
                   <div className="flex-grow space-y-2">
                      <p className="text-sm text-ink/70 mb-2">Share this <strong>Invitation Link</strong> with others to vote:</p>
                      <div className="flex items-center gap-2 bg-white/70 p-2 rounded border border-film-border/40">
                        <input
                          type="text"
                          readOnly
                          value={publicEventDisplayUrl}
                          aria-label="Invitation link"
                          className="flex-grow bg-transparent text-xs text-ink/80 font-mono focus:outline-none truncate"
                          onClick={(e) => {
                            e.currentTarget.select();
                            copyInvitationLink();
                          }}
                        />
                        <a
                          href={publicEventUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-film-accent hover:text-film-accent-hover whitespace-nowrap"
                        >
                          Open
                        </a>
                      </div>
                      <p className="text-[11px] text-ink/50">Tip: click/tap the URL to copy.</p>
                   </div>
                   <button 
                     onClick={() => {
                       copyInvitationLink();
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-2 bg-white/70 p-2 rounded border border-film-border/40 sm:flex-1">
                            <input
                              type="text"
                              readOnly
                              value={publicResultsDisplayUrl}
                              aria-label="Read-only results link URL"
                              className="flex-grow bg-transparent text-xs text-ink/80 font-mono focus:outline-none truncate"
                              onClick={(e) => {
                                e.currentTarget.select();
                                copyResultsLink();
                              }}
                            />
                            <a
                              href={publicResultsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-film-accent hover:text-film-accent-hover whitespace-nowrap"
                            >
                              Open
                            </a>
                          </div>
                           <button 
                             type="button"
                             onClick={copyResultsLink}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={handleModalKeyDown}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-close-title"
            aria-describedby="confirm-close-description"
            className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-sm space-y-4"
          >
            <h3 id="confirm-close-title" className="text-xl font-bold text-ink font-serif">
              Confirm Close Event
            </h3>
            <p id="confirm-close-description" className="text-ink/80 text-sm">
              Are you sure you want to close this event "{organizerData.title}"?
              Participants will no longer be able to submit or update their availability.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={closeConfirmModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
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
