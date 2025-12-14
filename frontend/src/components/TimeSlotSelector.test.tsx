import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TimeSlotSelector from './TimeSlotSelector';
import * as dateUtils from '../utils/dateUtils';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

});
