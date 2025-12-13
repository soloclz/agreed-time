import { useMemo, useState } from 'react';
import { parseISO, format, addMinutes, addDays } from 'date-fns';
import TimeSlotCell from './TimeSlotCell'; 
import TimeGrid from './TimeGrid'; 
import type { HeatmapCellData, TimeSlot } from '../types';

interface SlotData {
  slot: string; // ISO string
  count: number;
  attendees: string[];
}

interface HeatmapProps {
  slots: SlotData[];
  totalParticipants: number;
  slotDuration?: number; // Optional, default 60
}

export default function Heatmap({ slots, totalParticipants, slotDuration = 60 }: HeatmapProps) {
  // State for Grid Element (for Tooltip scroll handling)
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
  
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
      
      const startTime = format(dateObj, 'HH:mm');
      const endTime = format(addMinutes(dateObj, slotDuration), 'HH:mm');
      const hour = dateObj.getHours() + dateObj.getMinutes() / 60;

      if (dateStr < currentMinDate) currentMinDate = dateStr;
      if (dateStr > currentMaxDate) currentMaxDate = dateStr;
      currentMinHour = Math.min(currentMinHour, hour);
      currentMaxHour = Math.max(currentMaxHour, hour);
      
      const key = `${dateStr}_${startTime}-${endTime}`;
      
      data[key] = {
        date: dateStr,
        hour,
        count: s.count,
        ratio: totalParticipants > 0 ? s.count / totalParticipants : 0,
        participants: s.attendees,
        attendees: s.attendees,
      };

      if (s.count > 0) {
        availSlots.push({
            id: key,
            date: dateStr,
            hour,
            startTime,
            endTime
        });
      }
    });

    // Add padding to hours
    const finalMinHour = availSlots.length > 0 ? Math.max(0, Math.floor(currentMinHour) - 1) : 9;
    const finalMaxHour = availSlots.length > 0 ? Math.min(23, Math.ceil(currentMaxHour) + 1) : 18;


    return { 
        heatmapData: data, 
        minDate: availSlots.length > 0 ? currentMinDate : format(new Date(), 'yyyy-MM-dd'),
        maxDate: availSlots.length > 0 ? currentMaxDate : format(addDays(new Date(), 6), 'yyyy-MM-dd'),
        minHour: finalMinHour,
        maxHour: finalMaxHour,
    };
  }, [slots, slotDuration, totalParticipants]); // Added totalParticipants to deps

  if (slots.length === 0) {
    return null;
  }

  const noop = () => {};

  return (
    <div className="w-full pb-4">
      {/* Removed min-w-[600px] and overflow-x-auto from here, let TimeGrid handle scroll */}
      <div className="p-4 bg-white/90 rounded-xl border border-film-border shadow-sm">
        <TimeGrid
            startDate={minDate}
            endDate={maxDate}
            startHour={minHour}
            endHour={maxHour}
            slotDuration={slotDuration}
            onGridMount={setGridElement} // Pass setter to get grid ref
            onMouseDown={noop}
            onMouseEnter={noop}
            onMouseUp={noop}
            renderCell={(date, hour, slotLabel, key) => (
                <TimeSlotCell
                    key={key}
                    date={date}
                    hour={hour}
                    slotLabel={slotLabel}
                    mode="heatmap"
                    isSelected={false}
                    isSelectable={false}
                    heatmapData={heatmapData ? heatmapData[key] : undefined}
                    totalParticipants={totalParticipants}
                    gridScrollElement={gridElement} // Pass grid element for tooltip
                />
            )}
            renderDateHeader={(_date, defaultHeader) => (
                defaultHeader
            )}
        />
        
        <div className="mt-6 flex items-center justify-end gap-4 text-sm text-ink/60 flex-wrap">
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,0.40)]"></div>
                <span>Few</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,0.83)]"></div>
                <span>Most</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[rgba(225,29,72,1.0)]"></div>
                <span>All ({totalParticipants})</span>
            </div>
        </div>
      </div>
    </div>
  );
}