import { useMemo } from 'react';
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
  const selectedCount = selectedCells.size;
  const selectedDates = Object.keys(selectedSlotsByDate).sort();

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Bottom Panel Overlay */}
      {showBottomPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={onTogglePanel}
        />
      )}

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Expanded Panel */}
        <div
          className={`bg-white border-t-2 border-green-600 shadow-2xl transition-all duration-300 ease-in-out ${
            showBottomPanel ? 'max-h-[60vh]' : 'max-h-0'
          } overflow-hidden`}
        >
          {/* Panel Header */}
          <div className="bg-green-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Selected Time Slots</h3>
              <p className="text-xs text-gray-600">{selectedCount} slots selected</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClearAll();
                onTogglePanel();
              }}
              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Panel Content */}
          <div className="overflow-y-auto p-4 space-y-3 max-h-[calc(60vh-60px)]">
            {selectedDates.map(date => (
              <div key={date} className="border-b border-gray-200 pb-3 last:border-b-0">
                <div className="font-medium text-gray-900 mb-2 flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedSlotsByDate[date].length} slots
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSlotsByDate[date].map(slot => (
                    <button
                      type="button"
                      key={slot.id}
                      onClick={() => onRemoveSlot(slot.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-800 rounded text-xs hover:bg-red-100 hover:text-red-800 transition-colors"
                      title="Click to remove"
                    >
                      {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}
                      <span className="text-red-600">✕</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar - Always Visible */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePanel();
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-4 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 bg-white text-green-600 rounded-full text-sm font-bold">
              {selectedCount}
            </span>
            <span className="font-semibold">Selected Time Slots</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-100">
              {showBottomPanel ? 'Hide Details' : 'View Details'}
            </span>
            <span className={`transition-transform duration-300 ${showBottomPanel ? 'rotate-180' : ''}`}>
              ▲
            </span>
          </div>
        </button>
      </div>
    </>
  );
}
