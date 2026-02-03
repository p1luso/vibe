-- Add start_time column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add photos column to events table (array of text) if not exists
ALTER TABLE events ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Ensure expires_at uses start_time logic (9 hours after start)
-- We can't easily change the default value to depend on another column dynamically in pure SQL DEFAULT
-- But we can create a trigger or just handle it in application logic (which we are doing)
-- Let's just add the column for now so the insert works.
