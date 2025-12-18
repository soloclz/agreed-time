ALTER TABLE participants ADD COLUMN token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX idx_participants_token ON participants(token);