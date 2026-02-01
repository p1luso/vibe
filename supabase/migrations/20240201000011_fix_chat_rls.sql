-- Enable RLS for chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Allow users to view chats they are part of
CREATE POLICY "Users can view their chats"
ON chats
FOR SELECT
USING (auth.uid() = ANY(participant_ids));

-- Allow users to insert new chats (if they are participants)
CREATE POLICY "Users can create chats"
ON chats
FOR INSERT
WITH CHECK (auth.uid() = ANY(participant_ids));

-- Allow users to update chats they are part of
CREATE POLICY "Users can update their chats"
ON chats
FOR UPDATE
USING (auth.uid() = ANY(participant_ids));

-- Allow users to delete chats they are part of
CREATE POLICY "Users can delete their chats"
ON chats
FOR DELETE
USING (auth.uid() = ANY(participant_ids));
