import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import '@testing-library/jest-dom';
import type { ApiTimeRange } from '../types';
import EventParticipantForm from './EventParticipantForm';

// Mock Storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

const mockSubmitResponse = vi.fn().mockResolvedValue({ participant_token: 'mock-p-token' });
const mockUpdateParticipant = vi.fn().mockResolvedValue({});
const mockGetParticipant = vi.fn().mockResolvedValue(null);
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
    getParticipant: (...args: unknown[]) => mockGetParticipant(...args),
    updateParticipant: (...args: unknown[]) => mockUpdateParticipant(...args),
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
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
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
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    cleanup();
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
    mockSubmitResponse.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ participant_token: 'mock-p-token' }), 50)
    ));

    render(<EventParticipantForm publicToken="test-token" />);
    await waitFor(() => expect(screen.getByText('Test Event')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Bob' } });
    
    // Find button by text regardless of case or mode
    const submitButton = screen.getByRole('button', { name: /Availability/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    // Should be disabled and showing loading text
    await waitFor(() => expect(submitButton).toBeDisabled());
    
    // Use a more flexible matcher for "Submitting" or "Updating"
    await waitFor(() => {
      const buttonText = submitButton.textContent;
      expect(buttonText).toMatch(/ing.../i);
    });

    await waitFor(() => expect(screen.getByText(/Thank you!/i)).toBeInTheDocument(), { timeout: 3000 });
  });
});
