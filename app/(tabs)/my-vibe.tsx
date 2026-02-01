import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { Event, Chat, Profile } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function MyVibeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [chats, setChats] = useState<(Chat & { otherUser?: Profile, lastMessage?: string })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
        console.log('Fetching active event for user:', user.id);
        
        // 1. Fetch Active Event
        // We select the most recent one that hasn't expired
        const { data: eventsData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('creator_id', user.id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (eventError) {
             console.error('Error fetching event:', eventError);
        }
        
        const activeEventData = eventsData && eventsData.length > 0 ? eventsData[0] : null;
        console.log('Active event data:', activeEventData);
        setActiveEvent(activeEventData);

        // 2. Fetch Chats
        const { data: chatsData, error: chatsError } = await supabase
            .from('chats')
            .select('*')
            .contains('participant_ids', [user.id])
            .order('last_message_at', { ascending: false });

        if (chatsError) {
            console.error('Error fetching chats:', chatsError);
        } else if (chatsData) {
            // Enhance chats with other user profile and last message
            const enhancedChats = await Promise.all(chatsData.map(async (chat) => {
                const otherUserId = chat.participant_ids.find((id: string) => id !== user.id);
                let otherUser = null;
                if (otherUserId) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
                    otherUser = profile;
                }
                
                // Get last message content for preview
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('content')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    ...chat,
                    otherUser,
                    lastMessage: msgs?.content || 'Start chatting...'
                };
            }));
            setChats(enhancedChats);
        }

    } catch (e) {
        console.error(e);
    } finally {
        setRefreshing(false);
    }
  }, [user]);

  // Use useEffect instead of useFocusEffect to avoid potential navigation context issues during mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    // Moved to Profile Screen
    // await supabase.auth.signOut();
  };

  const handleDeleteEvent = async () => {
    if (!activeEvent) return;
    Alert.alert(
        "End Vibe?",
        "This will delete your joda and remove it from the map.",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "End Vibe", 
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase.from('events').delete().eq('id', activeEvent.id);
                    if (error) Alert.alert("Error", "Could not delete event");
                    else loadData();
                }
            }
        ]
    );
  };

  const handleTogglePrivacy = async () => {
      if (!activeEvent) return;
      const newPrivacy = activeEvent.privacy === 'public' ? 'secret' : 'public';
      const { error } = await supabase
        .from('events')
        .update({ privacy: newPrivacy })
        .eq('id', activeEvent.id);
      
      if (error) Alert.alert("Error", "Could not update privacy");
      else {
          setActiveEvent({...activeEvent, privacy: newPrivacy});
          Alert.alert("Updated", `Vibe is now ${newPrivacy}`);
      }
  };

  return (
    <View className="flex-1 bg-vibe-black p-4 pt-12">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-vibe-white text-3xl font-bold">My Vibe</Text>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#00FFFF" />}
      >
        {/* Active Joda Section */}
        <Text className="text-gray-400 mb-2 font-bold tracking-wider text-xs">ACTIVE JODA</Text>
        {activeEvent ? (
            <View key={activeEvent.id} className="bg-zinc-900 p-5 rounded-xl border border-vibe-cyan mb-8 shadow-lg shadow-vibe-cyan/20">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-vibe-white text-xl font-bold flex-1">{activeEvent.title}</Text>
                    <View className={`px-2 py-1 rounded-full ${activeEvent.privacy === 'secret' ? 'bg-vibe-magenta/20' : 'bg-vibe-cyan/20'}`}>
                        <Text className={`text-xs font-bold ${activeEvent.privacy === 'secret' ? 'text-vibe-magenta' : 'text-vibe-cyan'}`}>
                            {activeEvent.privacy.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text className="text-gray-400 mb-4">{activeEvent.description}</Text>
                
                <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity 
                        className="flex-1 bg-zinc-800 py-3 rounded-lg items-center flex-row justify-center gap-2"
                        onPress={handleTogglePrivacy}
                    >
                        <Ionicons name={activeEvent.privacy === 'public' ? "eye-off" : "eye"} size={16} color="white" />
                        <Text className="text-white font-bold text-xs">
                            {activeEvent.privacy === 'public' ? 'Make Secret' : 'Make Public'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="flex-1 bg-red-900/30 border border-red-900 py-3 rounded-lg items-center flex-row justify-center gap-2"
                        onPress={handleDeleteEvent}
                    >
                        <Ionicons name="trash" size={16} color="#EF4444" />
                        <Text className="text-red-500 font-bold text-xs">End Vibe</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ) : (
            <View className="bg-zinc-900/50 border border-zinc-800 border-dashed p-8 rounded-xl mb-8 items-center justify-center">
                <Text className="text-gray-500 italic mb-4">No active vibe right now.</Text>
                <TouchableOpacity 
                    className="bg-vibe-magenta px-6 py-3 rounded-full shadow-lg shadow-vibe-magenta/40"
                    onPress={() => router.push('/create-event')}
                >
                    <Text className="text-white font-bold">+ Create Vibe</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* Chats Section */}
        <Text className="text-gray-400 mb-2 font-bold tracking-wider text-xs">ACTIVE CHATS</Text>
        {chats.length > 0 ? (
            chats.map((chat) => (
                <TouchableOpacity 
                    key={chat.id} 
                    className="bg-zinc-900 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-800 active:border-vibe-cyan"
                    onPress={() => router.push(`/chat/${chat.id}`)}
                >
                    <View className="w-12 h-12 bg-zinc-800 rounded-full mr-4 items-center justify-center border border-zinc-700">
                        {chat.otherUser?.avatar_url ? (
                             <Image source={{ uri: chat.otherUser.avatar_url }} className="w-full h-full rounded-full" />
                        ) : (
                             <Text className="text-vibe-cyan font-bold text-lg">
                                {chat.otherUser?.name?.charAt(0) || '?'}
                             </Text>
                        )}
                    </View>
                    <View className="flex-1">
                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-vibe-white font-bold text-base">{chat.otherUser?.name || 'Unknown User'}</Text>
                            <Text className="text-gray-600 text-xs">
                                {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        <Text className="text-gray-500 text-sm" numberOfLines={1}>{chat.lastMessage}</Text>
                    </View>
                </TouchableOpacity>
            ))
        ) : (
            <Text className="text-gray-600 text-center mt-4">No chats yet. Join a vibe or create one!</Text>
        )}
        
        <View className="h-20" /> 
      </ScrollView>
    </View>
  );
}
