-- Fix RLS for messages - allow insert if user is participant in the parent chat
DROP POLICY IF EXISTS "Users can insert messages" ON messages;

CREATE POLICY "Users can insert messages"
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chats
    WHERE id = chat_id
    AND auth.uid() = ANY(participant_ids)
  )
);

-- Ensure users can select messages from their chats
CREATE POLICY "Users can view messages"
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE id = chat_id
    AND auth.uid() = ANY(participant_ids)
  )
);
