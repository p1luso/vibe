-- Enable insert for authenticated users on profiles table
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure authenticated users can select their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Grant insert permission explicitly just in case
GRANT INSERT ON profiles TO authenticated;
