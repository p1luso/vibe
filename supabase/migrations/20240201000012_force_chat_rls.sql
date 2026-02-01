-- Fix RLS for chats - allow insert if user is in participant_ids
DROP POLICY IF EXISTS "Users can create chats" ON chats;

CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
WITH CHECK (
  auth.uid() = ANY(participant_ids)
);

-- Ensure authenticated users have usage on the sequence if needed (usually handled by platform but good to be safe)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
