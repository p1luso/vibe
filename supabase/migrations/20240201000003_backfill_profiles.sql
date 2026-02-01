-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email, name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
FROM auth.users
ON CONFLICT (id) DO NOTHING;
