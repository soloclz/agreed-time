CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_token VARCHAR(255) NOT NULL UNIQUE,
    organizer_token VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50) NOT NULL DEFAULT 'open', -- Changed to 'open' as discussed for MVP
    time_zone VARCHAR(100), -- Metadata for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE time_slots (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL
);

-- Index for faster lookup by tokens
CREATE INDEX idx_events_public_token ON events(public_token);
CREATE INDEX idx_events_organizer_token ON events(organizer_token);
CREATE INDEX idx_time_slots_event_id ON time_slots(event_id);