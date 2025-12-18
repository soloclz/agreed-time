import { useState, useEffect } from 'react';

interface RecentEvent {
  id: string;
  token: string;
  // In a future version, we could store title and date too, 
  // but for now let's just use the token/ID or fetch them?
  // Fetching all of them might be slow. 
  // Let's just show "Event [ID]" for now, or update the storage logic to save titles later.
  // For this fix, let's keep it simple: "Saved Event"
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
        const token = localStorage.getItem(key);
        if (token) {
           // We don't have timestamp in current storage format, so just push
           loadedEvents.push({ id, token, timestamp: 0 });
        }
      }
    }

    // Since we don't have timestamps yet, just show them as is.
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
                <span className="font-mono text-sm text-ink/70 group-hover:text-film-accent transition-colors">
                   Manage Event 
                   <span className="ml-2 opacity-30 text-xs">{event.id.slice(0, 8)}...</span>
                </span>
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
