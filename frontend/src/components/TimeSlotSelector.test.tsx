import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TimeSlotSelector from './TimeSlotSelector';
import * as dateUtils from '../utils/dateUtils';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('TimeSlotSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getTodayLocal to return a fixed date for consistent testing
    vi.spyOn(dateUtils, 'getTodayLocal').mockReturnValue('2025-12-15');
    // Mock addDays to be consistent
    vi.spyOn(dateUtils, 'addDays').mockImplementation((date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    });
  });

  it('renders date inputs in organizer mode', () => {
    render(<TimeSlotSelector />);
    
    // Using getAllByLabelText because there are desktop and mobile labels, 
    // but the code actually hides one with CSS. 
    // However, for testing, we can target the input by title or use the label text 'Start' / 'End'
    expect(screen.getByTitle('Start date')).toBeInTheDocument();
    expect(screen.getByTitle('End date')).toBeInTheDocument();
    expect(screen.getByTitle('Start hour')).toBeInTheDocument();
    expect(screen.getByTitle('End hour')).toBeInTheDocument();
  });

  it('updates date range and supports undo/redo', async () => {
    render(<TimeSlotSelector />);
    
    const startDateInput = screen.getByTitle('Start date');
    const initialStartDate = startDateInput.getAttribute('value');
    
    // Change start date
    const newDate = '2025-12-20';
    fireEvent.change(startDateInput, { target: { value: newDate } });
    
    expect(startDateInput).toHaveValue(newDate);

    // Find Undo button
    const undoButton = screen.getByLabelText(/undo/i);
    expect(undoButton).toBeInTheDocument();
    expect(undoButton).not.toBeDisabled();

    // Click Undo
    fireEvent.click(undoButton);

    // Expect date to revert
    expect(startDateInput).toHaveValue(initialStartDate);

    // Click Redo
    const redoButton = screen.getByLabelText(/redo/i);
    fireEvent.click(redoButton);

    // Expect date to change back
    expect(startDateInput).toHaveValue(newDate);
  });

  it('updates time range and supports undo/redo', () => {
    render(<TimeSlotSelector />);
    
    const startHourSelect = screen.getByTitle('Start hour');
    
    // Initial value (default 9 AM -> value 9)
    expect(startHourSelect).toHaveValue('9');

    // Change start time to 10 AM
    fireEvent.change(startHourSelect, { target: { value: '10' } });
    expect(startHourSelect).toHaveValue('10');

    // Click Undo
    const undoButton = screen.getByLabelText(/undo/i);
    fireEvent.click(undoButton);
    
    expect(startHourSelect).toHaveValue('9');
  });

  it('copies week 1 pattern into week 2 without removing existing week 2 selections', async () => {
    const { container } = render(<TimeSlotSelector />);

    // Wait for mount effect to initialize date range
    expect(await screen.findByTitle('Start date')).toHaveValue('2025-12-15');

    const week1Cell = container.querySelector('td[data-date="2025-12-15"][data-hour="9"]');
    const week2ExistingCell = container.querySelector('td[data-date="2025-12-22"][data-hour="10"]');

    expect(week1Cell).toBeTruthy();
    expect(week2ExistingCell).toBeTruthy();

    // Select week 1 pattern cell (Mon 9)
    fireEvent.mouseDown(week1Cell as HTMLElement, { button: 0 });
    fireEvent.mouseUp(week1Cell as HTMLElement);
    expect(week1Cell).toHaveAttribute('aria-selected', 'true');

    // Select an extra cell in week 2 (Mon 10) that should be preserved
    fireEvent.mouseDown(week2ExistingCell as HTMLElement, { button: 0 });
    fireEvent.mouseUp(week2ExistingCell as HTMLElement);
    expect(week2ExistingCell).toHaveAttribute('aria-selected', 'true');

    // Copy Week 1 into following weeks
    const copyButton = screen.getByLabelText(/Merge Week 1 selections into following weeks/i);
    expect(copyButton).not.toBeDisabled();
    fireEvent.click(copyButton);

    // Week 2 should now include the copied pattern cell (Mon 9) AND preserve the existing cell (Mon 10)
    const week2CopiedCell = container.querySelector('td[data-date="2025-12-22"][data-hour="9"]');
    expect(week2CopiedCell).toBeTruthy();
    expect(week2CopiedCell).toHaveAttribute('aria-selected', 'true');
    expect(week2ExistingCell).toHaveAttribute('aria-selected', 'true');
  });

  it('does not clear week 2 selections for days with no week 1 pattern', async () => {
    const { container } = render(<TimeSlotSelector />);

    expect(await screen.findByTitle('Start date')).toHaveValue('2025-12-15');

    const week1MondayCell = container.querySelector('td[data-date="2025-12-15"][data-hour="9"]');
    const week2TuesdayExistingCell = container.querySelector('td[data-date="2025-12-23"][data-hour="10"]');

    expect(week1MondayCell).toBeTruthy();
    expect(week2TuesdayExistingCell).toBeTruthy();

    // Week 1 pattern only on Monday
    fireEvent.mouseDown(week1MondayCell as HTMLElement, { button: 0 });
    fireEvent.mouseUp(week1MondayCell as HTMLElement);
    expect(week1MondayCell).toHaveAttribute('aria-selected', 'true');

    // Existing selection on week 2 Tuesday should be preserved (week 1 Tuesday has no pattern)
    fireEvent.mouseDown(week2TuesdayExistingCell as HTMLElement, { button: 0 });
    fireEvent.mouseUp(week2TuesdayExistingCell as HTMLElement);
    expect(week2TuesdayExistingCell).toHaveAttribute('aria-selected', 'true');

    const copyButton = screen.getByLabelText(/Merge Week 1 selections into following weeks/i);
    fireEvent.click(copyButton);

    expect(week2TuesdayExistingCell).toHaveAttribute('aria-selected', 'true');
  });

});
