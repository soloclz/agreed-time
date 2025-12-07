import { useMemo } from 'react';
import { parseISO, format, addMinutes } from 'date-fns';
import TimeSlotSelector from './TimeSlotSelector';
import type { HeatmapCellData, TimeSlot } from '../types';

interface SlotData {
  slot: string; // ISO string
  count: number;
  attendees: string[];
}

interface HeatmapProps {
  slots: SlotData[];
  totalParticipants: number;
}

export default function Heatmap({ slots, totalParticipants }: HeatmapProps) {
  // Transform data for TimeSlotSelector
  const { heatmapData, availableSlots } = useMemo(() => {
    const data: Record<string, HeatmapCellData> = {};
    const availSlots: TimeSlot[] = [];

    slots.forEach((s) => {
      const dateObj = parseISO(s.slot);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      
      // Assume 60 min slots for now, as per TimeSlotSelector default
      // TODO: Make this dynamic if needed
      const startTime = format(dateObj, 'HH:mm');
      const endTime = format(addMinutes(dateObj, 60), 'HH:mm');
      
      const key = `${dateStr}_${startTime}-${endTime}`;
      
      data[key] = {
        count: s.count,
        attendees: s.attendees,
      };

      if (s.count > 0) {
        availSlots.push({
            id: key,
            date: dateStr,
            startTime,
            endTime
        });
      }
    });

    return { heatmapData: data, availableSlots: availSlots };
  }, [slots]);

  if (slots.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px] p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-film-border shadow-sm">
        <TimeSlotSelector 
            mode="heatmap"
            heatmapData={heatmapData}
            totalParticipants={totalParticipants}
            availableSlots={availableSlots}
            slotDuration={60}
        />
      </div>
    </div>
  );
}