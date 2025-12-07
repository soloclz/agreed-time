import { useMemo } from 'react';
import { parseISO, format, addMinutes, addDays } from 'date-fns';
import TimeSlotCell from './TimeSlotCell'; // Using TimeSlotCell for individual cells
import TimeGrid from './TimeGrid'; // Using TimeGrid for grid structure
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
  // Transform data for TimeGrid (and TimeSlotCell)
  const { heatmapData, minDate, maxDate, minHour, maxHour } = useMemo(() => {
    const data: Record<string, HeatmapCellData> = {};
    const availSlots: TimeSlot[] = [];

    let currentMinDate = '9999-12-31';
    let currentMaxDate = '0000-01-01';
    let currentMinHour = 24;
    let currentMaxHour = 0;

    slots.forEach((s) => {
      const dateObj = parseISO(s.slot);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      
      // Assume 60 min slots for now, as per TimeGrid default slotDuration
      const startTime = format(dateObj, 'HH:mm');
      const endTime = format(addMinutes(dateObj, 60), 'HH:mm');
      const hour = dateObj.getHours();

      if (dateStr < currentMinDate) currentMinDate = dateStr;
      if (dateStr > currentMaxDate) currentMaxDate = dateStr;
      currentMinHour = Math.min(currentMinHour, hour);
      currentMaxHour = Math.max(currentMaxHour, hour);
      
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

    // Add padding to hours for better display if min/max hours were actually found
    const finalMinHour = availSlots.length > 0 ? Math.max(0, currentMinHour - 1) : 9;
    const finalMaxHour = availSlots.length > 0 ? Math.min(23, currentMaxHour + 1) : 18;


    return { 
        heatmapData: data, 
        minDate: availSlots.length > 0 ? currentMinDate : format(new Date(), 'yyyy-MM-dd'),
        maxDate: availSlots.length > 0 ? currentMaxDate : format(addDays(new Date(), 6), 'yyyy-MM-dd'), // Default to a week
        minHour: finalMinHour,
        maxHour: finalMaxHour,
    };
  }, [slots]);

  if (slots.length === 0) {
    return null;
  }

  // Heatmap mode doesn't need interactive onMouseDown/onMouseEnter/onMouseUp
  const noop = () => {};

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px] p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-film-border shadow-sm">
        <TimeGrid
            startDate={minDate}
            endDate={maxDate}
            startHour={minHour}
            endHour={maxHour}
            slotDuration={60}
            onMouseDown={noop} // No interaction in heatmap
            onMouseEnter={noop}
            onMouseUp={noop}
            renderCell={(date, hour, slotLabel, key, onMouseDownGrid, onMouseEnterGrid, onMouseUpGrid) => (
                <TimeSlotCell
                    key={key}
                    date={date}
                    hour={hour}
                    slotLabel={slotLabel}
                    mode="heatmap"
                    isSelected={false} // Not applicable for heatmap
                    isSelectable={false} // Not applicable for heatmap
                    heatmapData={heatmapData ? heatmapData[key] : undefined}
                    totalParticipants={totalParticipants}
                    onMouseDown={onMouseDownGrid} // Pass grid's default noop handlers
                    onMouseEnter={onMouseEnterGrid}
                    onMouseUp={onMouseUpGrid}
                />
            )}
            renderDateHeader={(_date, defaultHeader) => (
                defaultHeader // Default header is fine for heatmap, no interaction
            )}
        />
      </div>
    </div>
  );
}