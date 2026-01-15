import { useState } from 'react';

interface FloatingEditMenuProps {
  onCopyPattern: () => void;
  canCopy?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function FloatingEditMenu({ 
  onCopyPattern, 
  canCopy = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: FloatingEditMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const allDisabled = !canCopy && !canUndo && !canRedo;

  // Don't render anything if all actions are disabled
  if (allDisabled) {
    return null;
  }

  // Auto-close if suddenly disabled while open (though with the check above, this component unmounts)
  // We keep this logical check just in case we change the return null behavior later, 
  // but strictly speaking, if we return null above, the state is lost on unmount anyway.
  
  // Common button classes
  const actionBtnBase = "flex items-center justify-center transition-all shadow-md border border-film-border";
  const actionBtnEnabled = "bg-white text-ink hover:bg-film-light hover:scale-110 active:scale-95";
  const actionBtnDisabled = "bg-gray-50 text-gray-300 border-film-border/50 shadow-none cursor-not-allowed";

  return (
    <div className="z-40 print:hidden animate-pop-in">
      {/* Container for the dock and its expanded menu */}
      <div className="relative flex flex-col items-end">
        {/* Expanded Actions Menu (Vertical Speed Dial) */}
        <div 
          className={`absolute bottom-full right-0 mb-3 flex flex-col gap-3 items-end transition-all duration-300 ease-out origin-bottom ${
            isOpen 
              ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' 
              : 'opacity-0 translate-y-4 pointer-events-none scale-90'
          }`}
        >
           {/* Row 1 (Top): Undo/Redo */}
           {(onUndo || onRedo) && (
              <div className="flex items-center gap-2 mr-1">
                {onUndo && (
                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`${actionBtnBase} w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm ${
                      canUndo ? "text-ink hover:bg-white hover:scale-110 active:scale-95" : "text-gray-300 cursor-not-allowed shadow-none"
                    }`}
                    aria-label="Undo"
                    title="Undo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </button>
                )}
                {onRedo && (
                   <button
                    type="button"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`${actionBtnBase} w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm ${
                      canRedo ? "text-ink hover:bg-white hover:scale-110 active:scale-95" : "text-gray-300 cursor-not-allowed shadow-none"
                    }`}
                    aria-label="Redo"
                    title="Redo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                    </svg>
                  </button>
                )}
              </div>
           )}

            {/* Row 2 (Bottom): Repeat Pattern */}
            <button
                type="button"
                onClick={() => {
                  onCopyPattern();
                  setIsOpen(false);
                }}
                disabled={!canCopy}
                className={`${actionBtnBase} h-10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap bg-white/90 backdrop-blur-sm ${
                  canCopy
                    ? 'text-film-accent hover:bg-white hover:scale-105 active:scale-95'
                    : 'text-gray-300 cursor-not-allowed shadow-none border-gray-200'
                }`}
                aria-label="Copy the schedule from the first 7 days to all remaining dates"
                title="Copy the schedule from the first 7 days to all remaining dates"
            >
                <span className="text-lg mr-2">✨</span> Repeat First 7 Days
            </button>
        </div>

        {/* Main Toggle Button (The Dock itself) */}
        <button
          type="button"
          onClick={() => !allDisabled && setIsOpen(!isOpen)}
          disabled={allDisabled}
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.2)] border border-white/20 transition-all duration-300 ${
             allDisabled 
             ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
             : 'bg-ink text-white hover:scale-105 active:scale-95 cursor-pointer'
          } ${
              isOpen ? 'rotate-45' : 'rotate-0'
          }`}
          aria-label={isOpen ? "Close actions menu" : "Open edit actions"}
          aria-expanded={isOpen}
          title={allDisabled ? "No actions available" : "Edit Actions"}
        >
          <span className="text-xl font-light">{isOpen ? '＋' : '⚡'}</span>
        </button>
      </div>
    </div>
  );
}
