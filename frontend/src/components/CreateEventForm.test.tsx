import { describe, it, expect, vi, beforeAll, afterAll, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import '@testing-library/jest-dom';
import type { ApiTimeRange } from '../types';
import CreateEventForm from './CreateEventForm';

const mockCreateEvent = vi.fn().mockResolvedValue({
  id: 'event-123',
  public_token: 'public-token',
  organizer_token: 'organizer-token',
});

vi.mock('../services/eventService', () => ({
  eventService: {
    createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  },
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

describe('CreateEventForm', () => {
  const mockLocalStorage: Storage = {
    get length() {
      return 0;
    },
    clear: vi.fn(),
    getItem: vi.fn(),
    key: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };

  beforeAll(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    mockCreateEvent.mockClear();
    (mockLocalStorage.setItem as unknown as Mock).mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('defaults organizer name to "Organizer" when left blank', async () => {
    render(<CreateEventForm />);

    fireEvent.change(screen.getByLabelText(/Event Title/i), { target: { value: 'My Event' } });
    const organizerInput = screen.getByLabelText(/Your name/i);
    fireEvent.change(organizerInput, { target: { value: '   ' } });

    const submitButton = screen.getByRole('button', { name: /Create Event/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockCreateEvent).toHaveBeenCalled());

    const [, , organizerNameArg, , , rangesArg] = mockCreateEvent.mock.calls[0];
    expect(organizerNameArg).toBe('Organizer');
    expect(rangesArg).toEqual(mockRanges);
  });

  it('enforces character limits and shows counters', () => {
    render(<CreateEventForm />);

    // Title
    const titleInput = screen.getByLabelText(/Event Title/i);
    expect(titleInput).toHaveAttribute('maxLength', '50');
    expect(screen.getByText('0/50')).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    expect(screen.getByText('10/50')).toBeInTheDocument();

    // Description
    const descriptionInput = screen.getByLabelText(/Description/i);
    expect(descriptionInput).toHaveAttribute('maxLength', '500');
    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    expect(screen.getByText('16/500')).toBeInTheDocument();

    // Organizer Name
    const organizerInput = screen.getByLabelText(/Your name/i);
    expect(organizerInput).toHaveAttribute('maxLength', '50');
    // Note: Default value is 'Organizer', so initial count is 9
    expect(screen.getByText('9/50')).toBeInTheDocument(); 

    fireEvent.change(organizerInput, { target: { value: 'Alice' } });
    expect(screen.getByText('5/50')).toBeInTheDocument();
  });
});
