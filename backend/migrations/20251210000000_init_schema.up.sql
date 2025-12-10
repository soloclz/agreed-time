CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_token VARCHAR(255) NOT NULL UNIQUE,
    organizer_token VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50) NOT NULL DEFAULT 'open',
    time_zone VARCHAR(100),
    organizer_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookup by tokens
CREATE INDEX idx_events_public_token ON events(public_token);
CREATE INDEX idx_events_organizer_token ON events(organizer_token);

-- 2. Event Slots Table (Organizer's time windows)
CREATE TABLE event_slots (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_slots_event_id ON event_slots(event_id);

-- 3. Participants Table (Identity)
CREATE TABLE participants (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure a name is unique within an event (optional, but good for UX)
    -- or allow duplicates? Let's allow duplicates for now as anonymous users might pick same name
    -- But usually for a simpler app, unique name per event avoids confusion.
    UNIQUE(event_id, name) 
);

CREATE INDEX idx_participants_event_id ON participants(event_id);

-- 4. Availabilities Table (Time Ranges)
CREATE TABLE availabilities (
    id BIGSERIAL PRIMARY KEY,
    participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availabilities_participant_id ON availabilities(participant_id);
