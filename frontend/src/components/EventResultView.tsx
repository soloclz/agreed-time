import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, addHours } from 'date-fns';
import { eventService } from '../services/eventService';
import type { EventResultsResponse } from '../types';
import Heatmap from './Heatmap';

// Helper function to get the current timezone offset string (e.g., "GMT+8")
function getTimezoneOffsetString(): string {
  const date = new Date();
  const offsetMinutes = date.getTimezoneOffset(); // Difference in minutes between UTC and local time
  const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
  const offsetRemainingMinutes = Math.abs(offsetMinutes % 60);

  const sign = offsetMinutes > 0 ? '-' : '+'; // If getTimezoneOffset is positive, local is behind UTC
  const formattedHours = String(offsetHours).padStart(2, '0');
  const formattedMinutes = String(offsetRemainingMinutes).padStart(2, '0');

  return `GMT${sign}${formattedHours}:${formattedMinutes}`;
}

export default function EventResultView({ publicToken }: { publicToken: string }) {
  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState<EventResultsResponse | null>(null);
  const [allSortedSlots, setAllSortedSlots] = useState<{ slot: string; count: number; attendees: string[] }[]>([]);
  const [timezoneOffsetString, setTimezoneOffsetString] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    // Set timezone string on mount
    setTimezoneOffsetString(getTimezoneOffsetString());

    const fetchResults = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEventResults(publicToken);
            if (data) {
                setResultsData(data);

                // Transform time_slots data to match original format
                // Convert to ISO string format for compatibility with date-fns
                const sortedSlots = data.time_slots
                  .map(slot => ({
                    slot: slot.start_at, // ISO string from backend
                    count: slot.availability_count,
                    attendees: slot.participants,
                  }))
                  .sort((a, b) => b.count - a.count);

                setAllSortedSlots(sortedSlots);
            }
        } catch (error) {
            console.error("Failed to fetch event results", error);
        } finally {
            setLoading(false);
        }
    };

    fetchResults();
  }, [publicToken]);

  const maxCount = useMemo(() => {
    if (allSortedSlots.length === 0) return 0;
    return allSortedSlots[0].count;
  }, [allSortedSlots]);

  const topPicks = useMemo(() => {
    return allSortedSlots.filter(slot => slot.count === maxCount && maxCount > 0);
  }, [allSortedSlots, maxCount]);

  const otherOptions = useMemo(() => {
    return allSortedSlots.filter(slot => slot.count < maxCount);
  }, [allSortedSlots, maxCount]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (loading) {
    return <div className="text-center py-12 text-ink/60 font-serif">Calculating best times...</div>;
  }

  if (!resultsData) {
      return <div className="text-center py-12 text-ink/60 font-serif">Event not found.</div>;
  }

  const totalParticipants = resultsData.total_participants;

  return (
    <div className="space-y-12 relative">
      {/* Action Bar (always visible) */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-white border border-film-border text-ink text-sm rounded-md hover:bg-gray-50 transition-colors font-sans font-medium flex items-center gap-2 shadow-sm"
        >
          {copiedShare ? 'Copied!' : 'Share Results'}
        </button>
      </div>

      {/* Header (always visible) */}
      <div className="text-center space-y-4 -mt-6"> {/* Negative margin to pull up closer to actions */}
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-ink tracking-tight">{resultsData.title}</h1>
        <p className="text-ink/80 text-lg font-sans max-w-2xl mx-auto leading-relaxed">{resultsData.description}</p>
        {timezoneOffsetString && (
          <p className="text-sm text-ink/50 font-mono italic mt-2">
            All times are shown in your local timezone ({timezoneOffsetString}).
          </p>
        )}
      </div>

      {totalParticipants === 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-film-border shadow-sm text-center space-y-4 mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-film-accent/70 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>

            <h3 className="text-2xl font-serif font-bold text-ink">No responses yet!</h3>
            <p className="text-ink/70 font-sans max-w-md mx-auto">
              Share the guest link with your participants to start collecting responses.
            </p>
            <div className="pt-4">
                <a href={`/event/${publicToken}`}
                   className="inline-flex items-center px-6 py-3 bg-film-accent text-white font-sans font-medium tracking-wide hover:bg-film-accent-hover transition-colors duration-300 rounded-lg shadow-md hover:shadow-lg">
                    Go to Guest Link
                </a>
            </div>
        </div>
      ) : (
        <>
          {/* Top Picks Section */}
          <section className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-film-border shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-ink mb-6 flex items-center gap-3">
              <span className="text-film-accent">✦</span> Best Time{topPicks.length > 1 ? 's' : ''}
            </h2>
            {topPicks.length > 0 ? (
              <div className="space-y-4">
                {topPicks.map((pick, index) => (
                  <div key={index} className="bg-film-accent/5 border border-film-accent/20 rounded-lg p-6 transition-all hover:bg-film-accent/10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-1">
                        <p className="text-3xl font-serif font-bold text-ink">
                           {format(parseISO(pick.slot), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xl font-mono text-ink/70">
                           {format(parseISO(pick.slot), 'EEEE, HH:mm')} - {format(addHours(parseISO(pick.slot), 1), 'HH:mm')}
                        </p>
                      </div>
                      <div className="text-right w-full md:w-auto">
                        <span className="inline-block bg-film-accent text-white px-4 py-1.5 rounded-md text-sm font-bold mb-2 shadow-sm">
                          {pick.count} / {totalParticipants} Available
                        </span>
                        <p className="text-sm text-ink/60 font-medium">
                          Includes: {pick.attendees.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink/50 italic font-serif">No common times found yet.</p>
            )}
          </section>

          {/* Other Options List */}
          <section>
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Other Options</h3>
            <div className="space-y-3">
                {otherOptions.length > 0 ? (
                  otherOptions.map((item, idx) => (
                      <div key={idx} className="group flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-lg border border-film-border hover:border-film-accent/30 transition-colors">
                          <div className="flex items-center gap-4 mb-2 sm:mb-0">
                              <span className="font-mono text-ink text-lg">
                                  {format(parseISO(item.slot), 'MMM d, HH:mm')} - {format(addHours(parseISO(item.slot), 1), 'HH:mm')}
                              </span>
                              <span className="text-sm text-ink/40 font-serif hidden sm:inline-block">
                                 — {format(parseISO(item.slot), 'EEEE')}
                              </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <span className="text-sm text-ink/60 truncate max-w-[150px]">{item.attendees.join(', ')}</span>
                              <span className="bg-paper border border-film-border text-ink/70 px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap group-hover:bg-film-accent/5 group-hover:text-film-accent group-hover:border-film-accent/20 transition-colors">
                                  {item.count} votes
                              </span>
                          </div>
                      </div>
                  ))
                ) : (
                  <p className="text-ink/50 italic font-serif">No other options with fewer votes.</p>
                )}
            </div>
          </section>

          {/* Participants List */}
          <section className="border-t border-film-border/50 pt-10">
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Participants <span className="text-film-accent text-lg align-top">{totalParticipants}</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resultsData.participants.map((participant, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-film-accent/20 flex items-center justify-center text-film-accent font-bold font-serif text-sm">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-ink">{participant.name}</p>
                    {participant.comment && <p className="text-ink/60 text-sm italic mt-1">"{participant.comment}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
             <Heatmap slots={allSortedSlots} totalParticipants={totalParticipants} />
          </section>
        </>
      )}
    </div>
  );
}
