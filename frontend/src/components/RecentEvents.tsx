import { useState, useEffect } from 'react';

interface RecentEvent {
  id: string;
  token: string;
  title: string;
  timestamp: number;
}

export default function RecentEvents() {
  const [events, setEvents] = useState<RecentEvent[]>([]);

  useEffect(() => {
    const loadedEvents: RecentEvent[] = [];
    
    // Scan localStorage for keys starting with 'agreed_time_admin_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('agreed_time_admin_')) {
        const id = key.replace('agreed_time_admin_', '');
        const value = localStorage.getItem(key);
        
        if (value) {
          try {
            // Try to parse as new JSON format
            const data = JSON.parse(value);
            if (data.token && data.title) {
               loadedEvents.push({
                 id,
                 token: data.token,
                 title: data.title,
                 timestamp: data.createdAt || 0
               });
               continue;
            }
          } catch (e) {
            // Ignore parse error, treat as legacy string
          }

          // Fallback for legacy data (just a string token)
          loadedEvents.push({ 
            id, 
            token: value, // The value itself is the token in legacy format
            title: 'Untitled Event', // Placeholder for legacy data
            timestamp: 0 
          });
        }
      }
    }

    // Sort by newest first (if timestamps exist)
    loadedEvents.sort((a, b) => b.timestamp - a.timestamp);
    setEvents(loadedEvents);
  }, []);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-film-border/20 w-full max-w-md mx-auto">
      <h3 className="text-sm font-bold text-ink/50 uppercase tracking-wider mb-4 font-sans">Recent Events (This Browser)</h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id}>
            <a 
              href={`/manage/${event.token}`}
              className="block p-4 bg-white border border-film-border/50 rounded-lg hover:border-film-accent hover:shadow-sm transition-all group"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-bold text-ink group-hover:text-film-accent transition-colors">
                     {event.title}
                  </span>
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
