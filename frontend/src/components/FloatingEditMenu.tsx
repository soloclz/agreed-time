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

  // Auto-close if suddenly disabled while open
  if (!canCopy && !canUndo && !canRedo && isOpen) {
    setIsOpen(false);
  }

  return (
    <div className="z-40 print:hidden">
      {/* Container for the dock and its expanded menu */}
      <div className="flex items-center">
        {/* Expanded Actions Menu (slides out from left) */}
        <div 
          className={`flex items-center space-x-2 mr-2 transition-all duration-300 ease-in-out ${
            isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
          }`}
        >
          {/* Undo Button */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center justify-center w-10 h-10 rounded-full bg-white border border-film-border shadow-md transition-all ${
                canUndo 
                  ? 'text-ink hover:bg-film-light hover:scale-110 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Undo"
              title="Undo"
            >
              <span className="text-lg">↩️</span>
            </button>
          )}

          {/* Redo Button */}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex items-center justify-center w-10 h-10 rounded-full bg-white border border-film-border shadow-md transition-all ${
                canRedo 
                  ? 'text-ink hover:bg-film-light hover:scale-110 active:scale-95' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Redo"
              title="Redo"
            >
              <span className="text-lg">↪️</span>
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
              className={`flex items-center justify-center h-10 px-3 py-1 rounded-md border border-film-border text-sm font-bold shadow-md transition-all whitespace-nowrap ${
                canCopy
                  ? 'bg-white text-film-accent hover:bg-film-light hover:scale-105 active:scale-95'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Copy Week 1 Pattern to All Weeks"
              title="Copy Week 1 Pattern to All Weeks"
          >
              <span className="text-lg mr-2">✨</span> Copy Week 1
          </button>
        </div>

        {/* Main Toggle Button (The Dock itself) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg transition-all duration-300 ${
             // Always enabled now as it holds Undo/Redo too
             'bg-ink text-white hover:scale-105 active:scale-95 cursor-pointer'
          } ${
              isOpen ? 'rotate-45' : 'rotate-0'
          }`}
          aria-label={isOpen ? "Close actions menu" : "Open edit actions"}
          aria-expanded={isOpen}
          title="Edit Actions"
        >
          <span className="text-xl font-light">{isOpen ? '＋' : '⚡'}</span>
        </button>
      </div>
    </div>
  );
}
