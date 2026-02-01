-- Enable insert for authenticated users on events table
CREATE POLICY "Users can insert their own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Ensure authenticated users can update/delete their own events
CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = creator_id);
