-- Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add new columns to events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Storage Buckets Setup (Attempt to create if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('event_photos', 'event_photos', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Storage Policies for Event Photos
CREATE POLICY "Event photos are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'event_photos' );

CREATE POLICY "Users can upload event photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'event_photos' AND auth.uid() IS NOT NULL );

CREATE POLICY "Users can delete their own event photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'event_photos' AND auth.uid() = owner );
