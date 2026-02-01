-- Add vibes_score to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vibes_score INTEGER DEFAULT 0;

-- Update RLS to allow reading this score
-- (Existing "Public profiles are viewable by everyone" covers SELECT)
-- (Existing "Users can update own profile" covers UPDATE)
