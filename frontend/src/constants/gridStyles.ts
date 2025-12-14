// Shared styling constants for TimeGrid and related components

export const GRID_STYLES = {
  // Column width constraints
  // Use w-14 (3.5rem) to enforce fixed width, combined with min-w for safety
  COL_WIDTH_CLASS: 'w-14 min-w-[3.5rem] max-w-[3.5rem]', 
  
  // Cell dimensions
  CELL_HEIGHT: 'h-12', // 48px height
  
  // Header styles
  HEADER_HEIGHT: 'h-12',
  HEADER_PADDING: 'px-1 sm:px-2',
  
  // Interactive elements in header
  HEADER_BUTTON_CLASS: 'w-full h-full flex items-center justify-center hover:bg-film-light focus:bg-film-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-film-accent transition-colors',
};
