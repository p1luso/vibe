-- Create Friendships (Vibe Matches) Table
CREATE TABLE public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id_1 UUID REFERENCES public.profiles(id) NOT NULL,
    user_id_2 UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (user_id_1, user_id_2)
);

-- RLS for Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can insert friendship requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id_1);

CREATE POLICY "Users can update their own friendships"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Create Event Attendees Table (Who is actually at the party)
CREATE TABLE public.event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT CHECK (status IN ('going', 'invited', 'maybe')) DEFAULT 'going',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_event_attendee UNIQUE (event_id, user_id)
);

-- RLS for Event Attendees
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for event attendees"
    ON public.event_attendees FOR SELECT
    USING (true);

CREATE POLICY "Users can join events"
    ON public.event_attendees FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their attendance"
    ON public.event_attendees FOR UPDATE
    USING (auth.uid() = user_id);
