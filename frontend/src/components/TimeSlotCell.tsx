import { useMemo } from 'react';
import type { HeatmapCellData } from '../types';

interface TimeSlotCellProps {
  // Coordinates
  date: string;
  hour: number;
  slotLabel: string; // e.g. "09:00-10:00"

  // State
  mode: 'select' | 'heatmap';
  isSelected: boolean;
  isSelectable: boolean;
  
  // Heatmap Data
  heatmapData?: HeatmapCellData;
  totalParticipants?: number;

  // Interaction handlers from TimeGrid
  onMouseDown: (e: React.MouseEvent, date: string, hour: number) => void;
  onMouseEnter: (date: string, hour: number) => void;
  onMouseUp: () => void;
}

export default function TimeSlotCell({
  date,
  hour,
  slotLabel,
  mode,
  isSelected,
  isSelectable,
  heatmapData,
  totalParticipants = 0,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: TimeSlotCellProps) {
  
  // Memoize opacity calculation to avoid recalculating on every render if props haven't changed
  const { finalOpacity, hasVotes, count, attendees } = useMemo(() => {
    if (mode !== 'heatmap') {
      return { finalOpacity: 0, hasVotes: false, count: 0, attendees: [] };
    }

    const count = heatmapData?.count || 0;
    const attendees = heatmapData?.attendees || [];
    
    // 1. Get raw ratio (0 to 1)
    const rawRatio = totalParticipants > 0 ? count / totalParticipants : 0;
    
    // 2. Apply power curve (power < 1 boosts lower values)
    const scaledOpacity = Math.pow(rawRatio, 0.6);

    // 3. Ensure minimum visibility floor (0.15) and cap at 1.0
    const finalOpacity = count > 0 
        ? Math.min(1, Math.max(0.15, scaledOpacity)) 
        : 0;

    return { finalOpacity, hasVotes: count > 0, count, attendees };
  }, [mode, heatmapData, totalParticipants]);

  // Base classes shared by both modes
  const baseClasses = "relative group border-r border-b border-film-border w-16 h-12 box-border last:border-r-0 align-middle transition-colors";

  // Mode-specific styles/classes
  let modeClasses = "";
  let cssVars = {};

  if (mode === 'select') {
    if (isSelected) {
      modeClasses = "bg-film-accent";
    } else if (!isSelectable) {
      modeClasses = "bg-gray-100/50 cursor-not-allowed pattern-diagonal-lines opacity-50";
    } else {
      modeClasses = "cursor-pointer bg-film-light hover:bg-white active:bg-white";
    }
  } else {
    // Heatmap mode - Use CSS custom properties
    if (hasVotes) {
      modeClasses = "heatmap-cell";
      cssVars = { '--cell-opacity': finalOpacity };
    } else {
      modeClasses = "bg-transparent";
    }
  }

  return (
    <td
      role="gridcell"
      aria-selected={isSelected}
      aria-disabled={!isSelectable}
      data-date={date}
      data-hour={hour}
      className={`${baseClasses} ${modeClasses}`}
      style={cssVars as React.CSSProperties}
      onMouseDown={(e) => { if (mode === 'select' && isSelectable) onMouseDown(e, date, hour); }}
      onMouseEnter={() => { if (mode === 'select' && isSelectable) onMouseEnter(date, hour); }}
      onMouseUp={onMouseUp}
    >
      {mode === 'heatmap' && hasVotes && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xs font-bold ${finalOpacity > 0.6 ? 'text-white' : 'text-film-accent'}`}>
              {count}
            </span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-[200px] bg-ink text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
            <div className="font-bold mb-1">{date} @ {slotLabel}</div>
            <div className="text-white/80 whitespace-normal">
              {attendees.join(', ')}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-ink"></div>
          </div>
        </>
      )}
    </td>
  );
}
