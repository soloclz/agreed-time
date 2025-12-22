import { useState, useEffect } from 'react';
import { eventService } from '../services/eventService';

interface RecentEvent {
  id: string;
  public_token: string;
  organizer_token?: string;
  title: string;
  timestamp: number;
  role: 'host' | 'guest';
}

export default function RecentEvents() {
  const [events, setEvents] = useState<RecentEvent[]>([]);

  useEffect(() => {
    const eventsMap: Record<string, RecentEvent> = {};
    
    // Scan localStorage for history keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const isAdmin = key.startsWith('agreed_time_admin_');
      const isGuest = key.startsWith('agreed_time_guest_');

      if (isAdmin || isGuest) {
        const id = key.replace('agreed_time_admin_', '').replace('agreed_time_guest_', '');
        const value = localStorage.getItem(key);
        const role: 'host' | 'guest' = isAdmin ? 'host' : 'guest';
        
        if (value) {
          try {
            const data = JSON.parse(value);
            
            // Mandatory: Every recent event MUST have a public_token for validation
            if (!data.public_token) {
              localStorage.removeItem(key);
              continue;
            }

            const eventObj: RecentEvent = {
              id,
              public_token: data.public_token,
              organizer_token: data.organizer_token, // Only present for host
              title: data.title,
              timestamp: data.created_at || 0,
              role
            };

            // Deduplication: If this public_token already exists, prioritize 'host'
            const existing = eventsMap[eventObj.public_token];
            if (!existing || (eventObj.role === 'host' && existing.role === 'guest')) {
              eventsMap[eventObj.public_token] = eventObj;
            }
          } catch (e) {
            // Invalid JSON or legacy format - clean it up
            localStorage.removeItem(key);
          }
        }
      }
    }

    const allEvents = Object.values(eventsMap);
    
    // Optimistic render: show what we have first (sorted)
    allEvents.sort((a, b) => b.timestamp - a.timestamp);
    setEvents(allEvents);

    // Filter & Validate with Backend using PUBLIC tokens
    const tokensToCheck = allEvents.map(e => e.public_token).slice(0, 50);
    
    if (tokensToCheck.length > 0) {
      eventService.checkEventsStatus(tokensToCheck).then(statuses => {
        if (statuses === null) return;

        const validEvents: RecentEvent[] = [];
        let hasChanges = false;

        allEvents.forEach(evt => {
          if (tokensToCheck.includes(evt.public_token)) {
             if (statuses[evt.public_token]) {
                validEvents.push(evt);
             } else {
                // Not found in DB - clean up
                const key = evt.role === 'host' ? `agreed_time_admin_${evt.id}` : `agreed_time_guest_${evt.public_token}`;
                localStorage.removeItem(key);
                hasChanges = true;
             }
          } else {
             validEvents.push(evt);
          }
        });

        if (hasChanges) {
           setEvents(validEvents);
        }
      });
    }

  }, []);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-film-border/20 w-full max-w-md mx-auto">
      <h3 className="text-xl font-serif font-bold text-ink mb-6 text-left">
        Recent Events
      </h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={`${event.role}-${event.public_token}`}>
            <a 
              href={event.role === 'host' ? `/manage/${event.organizer_token}` : `/event/${event.public_token}`}
              className="block p-4 bg-white border border-film-border/50 rounded-lg hover:border-film-accent hover:shadow-sm transition-all group"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink group-hover:text-film-accent transition-colors">
                       {event.title}
                    </span>
                    {event.role === 'host' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-film-accent/10 text-film-accent border border-film-accent/20">
                        Organizer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink/40 font-mono mt-1">
                    {event.timestamp > 0 
                      ? new Date(event.timestamp).toLocaleDateString() 
                      : `ID: ${event.id.slice(0, 8)}...`
                    }
                  </span>
                </div>
                <span className="text-film-accent opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-center text-ink/30 mt-4">
        These links are stored in your browser. Clear cookies to remove.
      </p>
    </div>
  );
}
