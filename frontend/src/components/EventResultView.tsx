import { useState, useEffect } from 'react';
import { eventService } from '../services/eventService';
import type { EventResultsResponse } from '../types';
import EventResultsDisplay from './EventResultsDisplay';

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
  const [timezoneOffsetString, setTimezoneOffsetString] = useState<string>('');

  useEffect(() => {
    // Set timezone string on mount
    setTimezoneOffsetString(getTimezoneOffsetString());

    const fetchResults = async () => {
        setLoading(true);
        try {
            const data = await eventService.getEventResults(publicToken);
            if (data) {
                setResultsData(data);
            }
        } catch (error) {
            console.error("Failed to fetch event results", error);
        } finally {
            setLoading(false);
        }
    };

    fetchResults();
  }, [publicToken]);

  if (loading) {
    return <div className="text-center py-12 text-ink/60 font-serif">Calculating best times...</div>;
  }

  if (!resultsData) {
      return <div className="text-center py-12 text-ink/60 font-serif">Event not found.</div>;
  }

  return (
    <EventResultsDisplay 
      data={resultsData} 
      publicToken={publicToken} 
      timezoneOffsetString={timezoneOffsetString} 
    />
  );
}
