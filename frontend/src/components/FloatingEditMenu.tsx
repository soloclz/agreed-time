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
      <div className="flex items-center">
        {/* Expanded Actions Menu (slides out from left) */}
        <div 
          className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-w-[16rem] opacity-100 mr-2' : 'max-w-0 opacity-0 mr-0'
          }`}
        >
          {/* Inner container to hold width stable while outer clips */}
          <div className="flex items-center space-x-2 min-w-max px-1">
            {/* Undo Button */}
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`${actionBtnBase} w-10 h-10 rounded-full ${
                  canUndo ? actionBtnEnabled : actionBtnDisabled
                }`}
                aria-label="Undo"
                title="Undo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
            )}

            {/* Redo Button */}
            {onRedo && (
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`${actionBtnBase} w-10 h-10 rounded-full ${
                  canRedo ? actionBtnEnabled : actionBtnDisabled
                }`}
                aria-label="Redo"
                title="Redo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                </svg>
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-film-border/50 mx-1"></div>

            {/* Copy Pattern Button */}
            <button
                type="button"
                onClick={() => {
                  onCopyPattern();
                  setIsOpen(false);
                }}
                disabled={!canCopy}
                className={`${actionBtnBase} h-10 px-3 py-1 rounded-md text-sm font-bold whitespace-nowrap ${
                  canCopy
                    ? 'bg-white text-film-accent hover:bg-film-light hover:scale-105 active:scale-95'
                    : actionBtnDisabled
                }`}
                aria-label="Merge Week 1 selections into following weeks (won't overwrite)"
                title="Merge Week 1 selections into following weeks (won't overwrite)"
            >
                <span className="text-lg mr-2">✨</span> Repeat Week 1
            </button>
          </div>
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
