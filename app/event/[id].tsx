import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Share, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';

type EventDetails = {
    id: string;
    title: string;
    description: string;
    start_time: string;
    location: any;
    photos: string[];
    creator_id: string;
    creator: {
        name: string;
        avatar_url: string;
    };
};

type Attendee = {
    user_id: string;
    status: string;
    profile: {
        id: string;
        name: string;
        avatar_url: string;
        bio: string;
    };
    friendship_status?: 'none' | 'pending' | 'accepted'; 
};

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    
    const [event, setEvent] = useState<EventDetails | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [userAttendance, setUserAttendance] = useState<string | null>(null);

    const eventId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (eventId && user) {
            fetchEventDetails();
            fetchAttendees();
        }
    }, [eventId, user]);

    const fetchEventDetails = async () => {
        try {
            // Fetch Event + Creator
            const { data: eventData, error } = await supabase
                .from('events')
                .select(`
                    *,
                    creator:profiles!events_creator_id_fkey(name, avatar_url)
                `)
                .eq('id', eventId)
                .single();

            if (error) throw error;
            setEvent(eventData);

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not load event details");
        }
    };

    const fetchAttendees = async () => {
        try {
            // 1. Fetch Attendees
            const { data: attendeesData, error } = await supabase
                .from('event_attendees')
                .select(`
                    user_id,
                    status,
                    profile:profiles(id, name, avatar_url, bio)
                `)
                .eq('event_id', eventId);

            if (error) throw error;

            // 2. Check My Status
            const myEntry = attendeesData.find((a: any) => a.user_id === user?.id);
            setUserAttendance(myEntry?.status || null);

            // 3. Check Friendships for each attendee (to show/hide Vibrar button)
            // We need to know if I am already friends with them
            if (user) {
                const { data: friendships } = await supabase
                    .from('friendships')
                    .select('user_id_1, user_id_2, status')
                    .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
                
                const formattedAttendees = attendeesData.map((a: any) => {
                    // Find friendship where one side is me and other is them
                    const friendRecord = friendships?.find(f => 
                        (f.user_id_1 === user.id && f.user_id_2 === a.user_id) ||
                        (f.user_id_2 === user.id && f.user_id_1 === a.user_id)
                    );
                    
                    return {
                        ...a,
                        friendship_status: friendRecord ? friendRecord.status : 'none'
                    };
                });
                
                setAttendees(formattedAttendees);
            } else {
                setAttendees(attendeesData);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!user || !event) return;
        setIsJoining(true);
        try {
            const { error } = await supabase
                .from('event_attendees')
                .upsert({
                    event_id: event.id,
                    user_id: user.id,
                    status: 'going'
                });

            if (error) throw error;
            
            Alert.alert("You're in!", "Get ready to vibe.");
            fetchAttendees(); // Refresh list

        } catch (e) {
            Alert.alert("Error joining event");
        } finally {
            setIsJoining(false);
        }
    };

    const handleVibrar = async (targetUserId: string) => {
        if (!user) return;
        try {
            // 1. Check if they already vibed me (Reverse pending request)
            const { data: existingRequest } = await supabase
                .from('friendships')
                .select('*')
                .eq('user_id_1', targetUserId)
                .eq('user_id_2', user.id)
                .eq('status', 'pending')
                .single();

            if (existingRequest) {
                // IT'S A MATCH! Update to accepted
                const { error: updateError } = await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('id', existingRequest.id);
                
                if (updateError) throw updateError;
                
                Alert.alert("IT'S A VIBE! 🔥", "You are now connected.");
                
                setAttendees(prev => prev.map(a => 
                    a.user_id === targetUserId ? { ...a, friendship_status: 'accepted' } : a
                ));
                return;
            }

            // 2. Otherwise, send new request
            const { error } = await supabase
                .from('friendships')
                .insert({
                    user_id_1: user.id,
                    user_id_2: targetUserId,
                    status: 'pending'
                });

            if (error) throw error;
            
            Alert.alert("Vibe Sent!", "If they vibe back, it's a match.");
            
            // Optimistic update
            setAttendees(prev => prev.map(a => 
                a.user_id === targetUserId ? { ...a, friendship_status: 'pending' } : a
            ));

        } catch (e: any) {
            if (e.code === '23505') { // Unique violation
                Alert.alert("Already Vibing", "You already sent a request or are friends.");
            } else {
                console.error(e);
                Alert.alert("Error sending vibe");
            }
        }
    };

    const handleShare = async () => {
        if (!event) return;
        const redirectUrl = Linking.createURL(`event/${event.id}`);
        const message = `Come vibe with me at ${event.title}! 🎵 \n${redirectUrl}`;

        try {
            const result = await Share.share({
                message: message,
                url: redirectUrl, // iOS
                title: event.title
            });
        } catch (error) {
            Alert.alert("Error sharing");
        }
    };

    const openChat = async () => {
         // Re-using logic from MapScreen or create new chat
         // For now, simpler: Check if chat exists for this event
         if(!user || !event) return;

         // Find chat for this event
         const { data: chat } = await supabase
            .from('chats')
            .select('id')
            .eq('event_id', event.id)
            .limit(1)
            .single();
         
         if(chat) {
             router.push(`/chat/${chat.id}`);
         } else {
             // Create public chat for event
             const { data: newChat, error } = await supabase
                .from('chats')
                .insert({
                    event_id: event.id,
                    participant_ids: [user.id, event.creator_id], // Basic start
                    last_message_at: new Date()
                })
                .select()
                .single();
            
            if(newChat) router.push(`/chat/${newChat.id}`);
         }
    };

    if (loading || !event) {
        return <View className="flex-1 bg-vibe-black justify-center items-center"><ActivityIndicator color="#00FFFF" /></View>;
    }

    return (
        <View className="flex-1 bg-vibe-black">
             {/* Header Image */}
            <View className="h-64 w-full relative">
                <Image 
                    source={{ uri: event.photos?.[0] || 'https://via.placeholder.com/400' }} 
                    className="w-full h-full"
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    className="absolute bottom-0 w-full h-32"
                />
                <TouchableOpacity 
                    className="absolute top-12 left-4 bg-black/50 p-2 rounded-full"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                    className="absolute top-12 right-4 bg-black/50 p-2 rounded-full"
                    onPress={handleShare}
                >
                    <Ionicons name="share-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 -mt-6 rounded-t-3xl bg-vibe-black px-4 pt-6">
                <Text className="text-white text-3xl font-bold mb-2">{event.title}</Text>
                
                <View className="flex-row items-center mb-4">
                    <Ionicons name="time-outline" size={18} color="#00FFFF" />
                    <Text className="text-gray-300 ml-2">
                        {new Date(event.start_time).toLocaleDateString()} • {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                </View>

                <View className="flex-row items-center mb-6">
                    <Ionicons name="location-outline" size={18} color="#FF00FF" />
                    <Text className="text-gray-300 ml-2 flex-1" numberOfLines={1}>
                        {event.location?.address || "Secret Location"}
                    </Text>
                </View>

                <Text className="text-gray-400 mb-8 leading-5">{event.description}</Text>

                {/* Attendees Section */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white font-bold text-lg">Who's Vibing ({attendees.length})</Text>
                    {userAttendance && (
                         <TouchableOpacity onPress={openChat} className="bg-zinc-800 px-3 py-1 rounded-full flex-row items-center">
                             <Ionicons name="chatbubbles-outline" size={16} color="white" />
                             <Text className="text-white text-xs ml-1 font-bold">Chat</Text>
                         </TouchableOpacity>
                    )}
                </View>

                {attendees.map((attendee) => (
                    <View key={attendee.user_id} className="flex-row items-center bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800">
                        <Image 
                            source={{ uri: attendee.profile.avatar_url || 'https://via.placeholder.com/50' }} 
                            className="w-12 h-12 rounded-full bg-zinc-800"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-white font-bold">{attendee.profile.name}</Text>
                            <Text className="text-gray-500 text-xs" numberOfLines={1}>
                                {attendee.profile.bio || "No bio yet"}
                            </Text>
                        </View>

                        {/* Vibe Action */}
                        {attendee.user_id !== user?.id && (
                            attendee.friendship_status === 'none' ? (
                                <TouchableOpacity 
                                    className="bg-vibe-magenta px-4 py-2 rounded-full shadow-lg shadow-vibe-magenta/30"
                                    onPress={() => handleVibrar(attendee.user_id)}
                                >
                                    <Text className="text-white font-bold text-xs uppercase">Vibrar</Text>
                                </TouchableOpacity>
                            ) : (
                                <View className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700">
                                    <Text className="text-gray-400 font-bold text-xs uppercase">
                                        {attendee.friendship_status === 'pending' ? 'Sent' : 'Vibing'}
                                    </Text>
                                </View>
                            )
                        )}
                    </View>
                ))}
                
                <View className="h-32" />
            </ScrollView>

            {/* Sticky Bottom Button */}
            <View className="absolute bottom-0 w-full p-4 bg-black/80 backdrop-blur-md border-t border-zinc-800">
                {userAttendance ? (
                    <View className="bg-green-500/20 py-4 rounded-xl items-center border border-green-500/50">
                        <Text className="text-green-500 font-bold text-lg">You are going!</Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        className="bg-vibe-cyan py-4 rounded-xl items-center shadow-lg shadow-vibe-cyan/30"
                        onPress={handleJoin}
                        disabled={isJoining}
                    >
                        {isJoining ? (
                            <ActivityIndicator color="black" />
                        ) : (
                            <Text className="text-black font-bold text-lg uppercase tracking-widest">Join the Vibe</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
