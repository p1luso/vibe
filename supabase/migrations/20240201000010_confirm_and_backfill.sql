-- Confirm all unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Ensure profiles exist for all users (Backfill)
INSERT INTO public.profiles (id, email, name)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'User')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
