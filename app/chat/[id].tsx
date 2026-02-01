import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Message, Chat, Profile, Event } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const chatId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!chatId || !user) return;
    fetchChatDetails();
    fetchMessages();
    subscribeToMessages();

    return () => {
      supabase.removeAllChannels();
    };
  }, [chatId, user]);

  async function fetchChatDetails() {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      setChat(chatData);

      // Identify other user
      const otherUserId = chatData.participant_ids.find((pid: string) => pid !== user?.id);
      if (otherUserId) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();
        setOtherUser(userData);
      }

      // Fetch event if exists
      if (chatData.event_id) {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', chatData.event_id)
          .single();
        setEvent(eventData);
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  }

  function subscribeToMessages() {
    console.log("Subscribing to chat:", chatId);
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => {
              // Deduplicate just in case
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
          });
          // Scroll to bottom
          setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
        }
      )
      .subscribe((status) => {
          console.log("Subscription status:", status);
      });
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user || !chatId) return;

    // Check expiry
    if (event) {
        const expiresAt = new Date(event.expires_at);
        if (new Date() > expiresAt) {
            Alert.alert("Expired", "This vibe has expired. Messages are closed.");
            return;
        }
    }

    // Optimistic update (optional, but good for UX)
    // For now, we rely on Realtime for simplicity and consistency
    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      content: content,
    });

    if (error) {
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(content); // Restore message
    } else {
        // Update last_message_at in chat
        await supabase.from('chats').update({ last_message_at: new Date() }).eq('id', chatId);
    }
  }

  const isEventExpired = event ? new Date() > new Date(event.expires_at) : false;

  if (loading) {
    return (
      <View className="flex-1 bg-vibe-black justify-center items-center">
        <ActivityIndicator color="#00FFFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-vibe-black">
      <Stack.Screen 
        options={{
            headerTitle: otherUser?.name || 'Chat',
            headerStyle: { backgroundColor: '#000000' },
            headerTintColor: '#FFFFFF',
            headerRight: () => (
                <TouchableOpacity onPress={() => Alert.alert('Profile', `Viewing ${otherUser?.name}'s profile`)}>
                    <Ionicons name="person-circle-outline" size={28} color="#00FFFF" />
                </TouchableOpacity>
            )
        }} 
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
              <View
                className={`max-w-[80%] p-3 rounded-2xl ${
                  isMe ? 'bg-vibe-cyan rounded-tr-none' : 'bg-zinc-800 rounded-tl-none border border-zinc-700'
                }`}
              >
                <Text className={`${isMe ? 'text-black font-bold' : 'text-white'}`}>
                  {item.content}
                </Text>
                <Text className={`text-[10px] mt-1 ${isMe ? 'text-black/60' : 'text-gray-400'}`}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="p-4 bg-zinc-900 border-t border-zinc-800 flex-row items-center pb-8">
            {isEventExpired ? (
                <Text className="text-gray-500 text-center flex-1 italic">
                    This vibe has ended. Chat closed.
                </Text>
            ) : (
                <>
                    <TextInput
                        className="flex-1 bg-black text-white p-3 rounded-full border border-zinc-700 mr-3"
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity 
                        onPress={sendMessage}
                        className={`p-3 rounded-full ${!newMessage.trim() ? 'bg-zinc-700' : 'bg-vibe-magenta'}`}
                        disabled={!newMessage.trim()}
                    >
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </>
            )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
