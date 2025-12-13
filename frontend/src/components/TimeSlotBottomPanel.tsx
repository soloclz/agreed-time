import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimeSlot } from '../types';

interface TimeSlotBottomPanelProps {
  selectedCells: Set<string>;
  selectedSlotsByDate: Record<string, TimeSlot[]>;
  onRemoveSlot: (id: string) => void;
  onClearAll: () => void;
  showBottomPanel: boolean;
  onTogglePanel: () => void;
}

export default function TimeSlotBottomPanel({
  selectedCells,
  selectedSlotsByDate,
  onRemoveSlot,
  onClearAll,
  showBottomPanel,
  onTogglePanel
}: TimeSlotBottomPanelProps) {
  const [mounted, setMounted] = useState(false);
  const selectedCount = selectedCells.size;
  const selectedDates = Object.keys(selectedSlotsByDate).sort();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when panel is open to prevent background scrolling
  useEffect(() => {
    if (showBottomPanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showBottomPanel]);

  if (selectedCount === 0 || !mounted) return null;

  return createPortal(
    <>
      {/* Bottom Panel Overlay */}
      {showBottomPanel && (
        <div
          className="fixed inset-0 bg-black/20 z-[70]"
          onClick={onTogglePanel}
          role="button"
          tabIndex={0}
          aria-label="Close panel"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onTogglePanel();
            }
          }}
        />
      )}

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[80]">
        {/* Expanded Panel */}
        {showBottomPanel && (
          <div className="bg-white border-t border-film-border shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-film-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-ink">Selected Time Slots</h3>
                <p className="text-sm text-gray-600 font-mono">{selectedCount} slots selected</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  onTogglePanel();
                }}
                className="px-4 py-2 text-xs bg-transparent border border-film-border text-ink font-mono font-bold hover:bg-ink hover:text-paper transition-colors"
              >
                CLEAR ALL
              </button>
            </div>

            {/* Panel Content */}
            <div className="overflow-y-auto p-6 space-y-4 max-h-[60vh] overscroll-contain">
              
              {selectedDates.map(date => (
                <div key={date} className="border-b border-dashed border-gray-300 pb-4 last:border-b-0">
                  <div className="font-bold text-gray-800 mb-3 flex items-center justify-between font-serif">
                    <span className="text-base">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {selectedSlotsByDate[date].length} slots
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSlotsByDate[date].map(slot => (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => onRemoveSlot(slot.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-film-accent text-white shadow-sm text-sm font-mono hover:bg-film-accent-hover transition-colors group rounded-sm"
                        title="Click to remove"
                      >
                        {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
                        <span className="text-white/70 group-hover:text-white">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Bar - Always Visible */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePanel();
          }}
          className="w-full bg-white hover:bg-gray-50 text-ink px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-colors border-t border-film-border shadow-[0_-4px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center justify-center min-w-[2rem] h-8 px-2 bg-film-accent text-white font-mono font-bold text-sm rounded-full shadow-sm">
              {selectedCount}
            </span>
            <span className="hidden sm:inline font-serif font-bold text-base sm:text-lg tracking-wide">Selected Time Slots</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold">
            <span className="uppercase tracking-wider">
              {showBottomPanel ? 'Hide' : 'Details'}
            </span>
            <span className={`transition-transform duration-300 ${showBottomPanel ? 'rotate-180' : ''}`}>
              ▲
            </span>
          </div>
        </button>
      </div>
    </>,
    document.body
  );
}