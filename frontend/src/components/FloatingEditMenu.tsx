import { useState } from 'react';

interface FloatingEditMenuProps {
  onCopyPattern: () => void;
  // Future props: onUndo, onRedo, etc.
}

export default function FloatingEditMenu({ onCopyPattern }: FloatingEditMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          {/* Copy Pattern Button */}
          <button
              type="button"
              onClick={() => {
                onCopyPattern();
                setIsOpen(false);
              }}
              className="flex items-center justify-center h-10 px-3 py-1 rounded-md bg-white border border-film-border text-film-accent text-sm font-bold shadow-md hover:bg-film-light hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
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
          className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-ink text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
              isOpen ? 'rotate-45' : 'rotate-0'
          }`}
          aria-label={isOpen ? "Close actions menu" : "Open edit actions"}
          aria-expanded={isOpen}
        >
          <span className="text-xl font-light">{isOpen ? '＋' : '⚡'}</span>
        </button>
      </div>
    </div>
  );
}
