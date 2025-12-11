import { useState, useMemo } from 'react';
import { format, parseISO, addMinutes } from 'date-fns';
import type { EventResultsResponse, OrganizerEventResponse } from '../types';
import Heatmap from './Heatmap';
import { 
  findOrganizerName, 
  filterOrganizerOnlySlots, 
  isOrganizerOnly as checkIsOrganizerOnly,
  rangesToCells 
} from '../utils/eventUtils';

interface EventResultsDisplayProps {
  data: EventResultsResponse | OrganizerEventResponse;
  publicToken: string;
  timezoneOffsetString: string;
}

interface ComputedSlot {
  slot: string; // ISO string
  count: number;
  attendees: string[];
}

export default function EventResultsDisplay({ data, publicToken, timezoneOffsetString }: EventResultsDisplayProps) {
  const [copiedShare, setCopiedShare] = useState(false);

  const totalParticipants = data.total_participants;
  const slotDuration = data.slot_duration || 60; // Use event's slot duration

  // Transform Participant Ranges into Computed Slots (Intersection Logic)
  const allSortedSlots = useMemo(() => {
    // 2. Map: "YYYY-MM-DD_H.5" -> { count, attendees }
    const slotMap = new Map<string, { count: number, attendees: string[] }>();

    data.participants.forEach(p => {
      // Convert this participant's ranges to cells
      const cells = rangesToCells(p.availabilities, slotDuration);
      
      cells.forEach(cellKey => {
        if (!slotMap.has(cellKey)) {
          slotMap.set(cellKey, { count: 0, attendees: [] });
        }
        const entry = slotMap.get(cellKey)!;
        entry.count += 1;
        entry.attendees.push(p.name);
      });
    });

    // 3. Convert Map to Array and Sort
    const result: ComputedSlot[] = [];
    slotMap.forEach((value, key) => {
      const [dateStr, hourStr] = key.split('_');
      const hour = parseFloat(hourStr);
      const [year, month, day] = dateStr.split('-').map(Number);
      
      const date = new Date(year, month - 1, day);
      const hours = Math.floor(hour);
      const minutes = Math.round((hour % 1) * 60);
      date.setHours(hours);
      date.setMinutes(minutes);
      
      result.push({
        slot: date.toISOString(), 
        count: value.count,
        attendees: value.attendees
      });
    });

    // Sort by count (desc), then by time (asc)
    return result.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.slot.localeCompare(b.slot);
    });

  }, [data.participants, slotDuration]);

  const maxCount = useMemo(() => {
    if (allSortedSlots.length === 0) return 0;
    return allSortedSlots[0].count;
  }, [allSortedSlots]);

  // Find organizer's name
  const organizerName = useMemo(() => {
    return findOrganizerName(data.participants);
  }, [data.participants]);

  const topPicks = useMemo(() => {
    // We want to filter out slots where ONLY the organizer is available IF there are other people
    // But topPicks logic: usually maxCount > 1 if multiple people responded.
    // If only organizer responded, maxCount is 1.
    return allSortedSlots.filter(slot => slot.count === maxCount && maxCount > 0);
  }, [allSortedSlots, maxCount]);

  const otherOptions = useMemo(() => {
    return allSortedSlots.filter(slot => slot.count < maxCount);
  }, [allSortedSlots, maxCount]);

  const handleShare = () => {
    const url = `${window.location.origin}/event/${publicToken}/result`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Check if only the organizer has responded
  const isOrganizerOnly = checkIsOrganizerOnly(totalParticipants, data.participants);

  return (
    <div className="space-y-12 relative">
      {/* Header */}
      <div className="text-center space-y-4 -mt-6">
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-ink tracking-tight">{data.title}</h1>
        <p className="text-ink/80 text-lg font-sans max-w-2xl mx-auto leading-relaxed">{data.description}</p>
        {timezoneOffsetString && (
          <p className="text-sm text-ink/50 font-mono italic mt-2">
            All times are shown in your local timezone ({timezoneOffsetString}).
          </p>
        )}
      </div>

      {totalParticipants === 0 ? (
        <div className="bg-white/90 rounded-xl p-8 border border-film-border shadow-sm text-center space-y-4 mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-film-accent/70 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>

            <h3 className="text-2xl font-serif font-bold text-ink">No responses yet!</h3>
            <p className="text-ink/70 font-sans max-w-md mx-auto">
              Share the guest link with your participants.
            </p>
        </div>
      ) : isOrganizerOnly ? (
        <div className="bg-white/90 rounded-xl p-8 border border-film-border shadow-sm text-center space-y-4 mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-film-accent/70 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>

            <h3 className="text-2xl font-serif font-bold text-ink">Waiting for participants</h3>
            <p className="text-ink/70 font-sans max-w-md mx-auto">
              Only the organizer has filled in their availability. Share the guest link to collect responses.
            </p>
        </div>
      ) : (
        <>
          {/* Top Picks Section */}
          <section className="bg-white/90 rounded-xl p-8 border border-film-border shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-ink mb-6 flex items-center gap-3">
              <span className="text-film-accent">✦</span> Best Time{topPicks.length > 1 ? 's' : ''}
            </h2>
            {topPicks.length > 0 ? (
              <div className="space-y-4">
                {topPicks.map((pick, index) => (
                  <div key={index} className="bg-film-accent/5 border border-film-accent/20 rounded-lg p-6 transition-colors hover:bg-film-accent/10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-1">
                        <p className="text-3xl font-serif font-bold text-ink">
                           {format(parseISO(pick.slot), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xl font-mono text-ink/70">
                           {format(parseISO(pick.slot), 'EEEE, HH:mm')} - {format(addMinutes(parseISO(pick.slot), slotDuration), 'HH:mm')}
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
                  otherOptions.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="group flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-lg border border-film-border hover:border-film-accent/30 transition-colors">
                          <div className="flex items-center gap-4 mb-2 sm:mb-0">
                              <span className="font-mono text-ink text-lg">
                                  {format(parseISO(item.slot), 'MMM d, HH:mm')}
                              </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              <span className="text-sm text-ink/60 truncate max-w-[150px]">{item.attendees.join(', ')}</span>
                              <span className="bg-paper border border-film-border text-ink/70 px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                                  {item.count} votes
                              </span>
                          </div>
                      </div>
                  ))
                ) : (
                  <p className="text-ink/50 italic font-serif">No other options.</p>
                )}
            </div>
          </section>

          {/* Participants List */}
          <section className="border-t border-film-border/50 pt-10">
            <h3 className="text-2xl font-serif font-bold text-ink mb-6">Participants <span className="text-film-accent text-lg align-top">{totalParticipants}</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.participants.map((participant, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-film-accent/20 flex items-center justify-center text-film-accent font-bold font-seri text-sm">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-ink">{participant.name}</p>
                        {participant.is_organizer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-film-accent/10 text-film-accent border border-film-accent/20">
                                Organizer
                            </span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
             <Heatmap slots={allSortedSlots} totalParticipants={totalParticipants} slotDuration={slotDuration} />
          </section>
        </>
      )}
    </div>
  );
}
