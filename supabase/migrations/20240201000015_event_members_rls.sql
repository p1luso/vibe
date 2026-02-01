-- Ensure RLS allows selecting event_members for authenticated users
CREATE POLICY "Authenticated users can view event members"
ON event_members
FOR SELECT
USING (auth.uid() IS NOT NULL);
