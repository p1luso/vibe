export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_verified: boolean;
  subscription_type: 'free' | 'premium';
  chat_limit_reset: string;
  chats_started_today: number;
  created_at: string;
  photos?: string[];
  bio?: string;
  tags?: string[];
  vibes_score?: number;
}

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  location: { type: string; coordinates: [number, number] } | any; // PostGIS handling
  privacy: 'public' | 'secret';
  radius_meters: number;
  expires_at: string;
  is_boosted: boolean;
  created_at: string;
  photos?: string[];
}

export interface Chat {
  id: string;
  event_id?: string;
  participant_ids: string[];
  created_at: string;
  last_message_at: string;
  event?: Event; // Joined
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: Profile; // Joined
}
