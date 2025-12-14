import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HeatmapCellData } from '../types';
import { getDayOfWeek } from '../utils/dateUtils';

interface TimeSlotCellProps {
  // Coordinates
  date: string;
  hour: number;
  slotLabel: string; // e.g. "09:00-10:00"

  // State
  mode: 'select' | 'heatmap';
  isSelected: boolean;
  isSelectable: boolean;
  highlightWeekends?: boolean; // New prop, defaults to true
  
  // Heatmap Data
  heatmapData?: HeatmapCellData;
  totalParticipants?: number;

  // Element reference to the TimeGrid's scrollable area for hiding tooltip on scroll
  gridScrollElement?: HTMLDivElement | null;
}

export default function TimeSlotCell({
  date,
  hour,
  slotLabel,
  mode,
  isSelected,
  isSelectable,
  highlightWeekends = true,
  heatmapData,
  totalParticipants = 0,
  gridScrollElement, // Changed from ref to direct element
}: TimeSlotCellProps) {
  
  // Memoize opacity calculation
  const { finalOpacity, hasVotes, count, attendees } = useMemo(() => {
    if (mode !== 'heatmap') {
      return { finalOpacity: 0, hasVotes: false, count: 0, attendees: [] };
    }

    const count = heatmapData?.count || 0;
    const attendees = heatmapData?.attendees || [];
    
    // 1. Get raw ratio (0 to 1)
    const rawRatio = totalParticipants > 0 ? count / totalParticipants : 0;
    
    // 2. Apply power curve
    const scaledOpacity = Math.pow(rawRatio, 0.6);

    // 3. Ensure minimum visibility floor
    const finalOpacity = count > 0 
        ? Math.min(1, Math.max(0.15, scaledOpacity)) 
        : 0;

    return { finalOpacity, hasVotes: count > 0, count, attendees };
  }, [mode, heatmapData, totalParticipants]);

  // Tooltip State (Portal)
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const cellRef = useRef<HTMLTableCellElement>(null);
  
  // Hydration check for Portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);

    // Hide tooltip on window scroll or resize
    const handleWindowScrollOrResize = () => {
      setShowTooltip(false);
    };

    // Hide tooltip on grid scroll (horizontal)
    const handleGridScroll = () => {
      setShowTooltip(false);
    };

    window.addEventListener('scroll', handleWindowScrollOrResize, { passive: true });
    window.addEventListener('resize', handleWindowScrollOrResize);

    if (gridScrollElement) {
        gridScrollElement.addEventListener('scroll', handleGridScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleWindowScrollOrResize);
      window.removeEventListener('resize', handleWindowScrollOrResize);
      if (gridScrollElement) {
          gridScrollElement.removeEventListener('scroll', handleGridScroll);
      }
    };
  }, [gridScrollElement]);

  const updateTooltipPosition = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setTooltipPos({
        // rect.top is relative to viewport. Add scrollY to get absolute position in document.
        top: rect.top + window.scrollY, 
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
  };

  const handleMouseEnter = () => {
    // Only handling tooltip here. Selection/Drag events are delegated in TimeGrid.
    if (mode === 'heatmap' && hasVotes) {
      updateTooltipPosition();
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (mode === 'heatmap') {
      setShowTooltip(false);
    }
  };

  const handleClick = () => {
    // Mobile toggle support for Heatmap tooltip
    if (mode === 'heatmap' && hasVotes) {
      if (showTooltip) {
        setShowTooltip(false);
      } else {
        updateTooltipPosition();
        setShowTooltip(true);
      }
    }
  };

  // Base classes shared by both modes
  // Removed hover:z-[60] as we are using Portal now
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
      const dayOfWeek = getDayOfWeek(date);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let bgClass = 'bg-film-light'; // Default for weekdays
      let hoverActiveClasses = 'hover:bg-film-border active:bg-film-accent/20'; // Default for weekdays
      
      if (highlightWeekends && isWeekend) {
        bgClass = 'bg-film-accent/5';
        hoverActiveClasses = 'hover:bg-film-accent/10 active:bg-film-accent/20';
      }

      modeClasses = `cursor-pointer ${bgClass} ${hoverActiveClasses}`;
    }
  } else {
    // Heatmap mode
    if (hasVotes) {
      modeClasses = "heatmap-cell";
      cssVars = { '--cell-opacity': finalOpacity };
    } else {
      modeClasses = "bg-transparent";
    }
  }

  return (
    <>
      <td
        ref={cellRef}
        role="gridcell"
        aria-selected={isSelected}
        aria-disabled={!isSelectable}
        data-date={date}
        data-hour={hour}
        className={`${baseClasses} ${modeClasses}`}
        style={cssVars as React.CSSProperties}
        // Selection events are removed here (delegated in TimeGrid)
        // Only Tooltip interactions remain
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {mode === 'heatmap' && hasVotes && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-xs font-bold ${finalOpacity > 0.6 ? 'text-white' : 'text-film-accent'}`}>
              {count}
            </span>
          </div>
        )}
      </td>

      {/* Portal Tooltip */}
      {mounted && showTooltip && mode === 'heatmap' && hasVotes && createPortal(
        <div 
          className="absolute z-[9999] pointer-events-none flex flex-col items-center"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px' // Gap between cell and tooltip
          }}
        >
            <div className="bg-ink text-white text-xs rounded p-2 shadow-lg max-w-[200px] mb-[-1px]">
                <div className="font-bold mb-1">{date} @ {slotLabel}</div>
                <div className="text-white/80 whitespace-normal">
                    {attendees.join(', ')}
                </div>
            </div>
            {/* Arrow - using border hack */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-ink"></div>
        </div>,
        document.body
      )}
    </>
  );
}