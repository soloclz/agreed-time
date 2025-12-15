import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import '@testing-library/jest-dom';
import type { ApiTimeRange } from '../types';
import EventParticipantForm from './EventParticipantForm';

const mockSubmitResponse = vi.fn().mockResolvedValue({});
const mockGetEvent = vi.fn().mockResolvedValue({
  id: 'event-123',
  title: 'Test Event',
  description: 'Test Description',
  organizerName: 'Organizer',
  state: 'open',
  slotDuration: 60,
  eventSlots: [{ start_at: '2025-01-01T00:00:00Z', end_at: '2025-01-01T01:00:00Z' }]
});

vi.mock('../services/eventService', () => ({
  eventService: {
    getEvent: (...args: unknown[]) => mockGetEvent(...args),
    submitResponse: (...args: unknown[]) => mockSubmitResponse(...args),
  },
  ApiError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
          super(message);
          this.code = code;
      }
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRanges: ApiTimeRange[] = [
  { start_at: '2025-01-01T00:00:00Z', end_at: '2025-01-01T01:00:00Z' },
];

vi.mock('./TimeSlotSelector', () => ({
  default: ({ onRangesChange }: { onRangesChange: (ranges: ApiTimeRange[]) => void }) => {
    useEffect(() => {
      onRangesChange(mockRanges);
    }, [onRangesChange]);

    return <div>TimeSlotSelector Mock</div>;
  },
}));

describe('EventParticipantForm', () => {
  afterEach(() => {
    mockSubmitResponse.mockClear();
    mockGetEvent.mockClear();
  });

  it('enforces character limits and shows counters', async () => {
    render(<EventParticipantForm publicToken="test-token" />);

    await waitFor(() => expect(screen.getByText('Test Event')).toBeInTheDocument());

    // Participant Name
    const nameInput = screen.getByLabelText(/Your Name/i);
    expect(nameInput).toHaveAttribute('maxLength', '50');
    expect(screen.getByText('0/50')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    expect(screen.getByText('5/50')).toBeInTheDocument();

    // Comment
    const commentInput = screen.getByLabelText(/Comments/i);
    expect(commentInput).toHaveAttribute('maxLength', '500');
    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(commentInput, { target: { value: 'My comment' } });
    expect(screen.getByText('10/500')).toBeInTheDocument();
  });

  it('locks submission on submit', async () => {
    // Mock slow response
    mockSubmitResponse.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<EventParticipantForm publicToken="test-token" />);
    await waitFor(() => expect(screen.getByText('Test Event')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Bob' } });
    
    const submitButton = screen.getByRole('button', { name: /Submit Availability/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    // Should be disabled and showing loading text immediately after click
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Submitting...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Thank you!')).toBeInTheDocument());
  });
});
