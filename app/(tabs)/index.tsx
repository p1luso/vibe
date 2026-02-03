import { StyleSheet, View, Text, Alert, TouchableOpacity, Modal, Image } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const mapRef = useRef<MapView>(null);

  // Initial location fetch
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  // Force 3D pitch when map is ready or location changes
  useEffect(() => {
    if (location && mapRef.current) {
        // Wait a bit for map to load
        setTimeout(() => {
            mapRef.current?.animateCamera({
                center: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                },
                pitch: 65, // Slightly less steep to ensure buildings render
                heading: 0,
                altitude: 150, // Lower altitude
                zoom: 18 // Higher zoom
            }, { duration: 1000 });
        }, 500);
    }
  }, [location]);

  // Fetch events when screen focuses or location changes
  useFocusEffect(
    useCallback(() => {
        if (location) {
            fetchEvents(location.coords.latitude, location.coords.longitude);
        }
    }, [location])
  );

  async function fetchEvents(lat: number, lng: number) {
    const { data, error } = await supabase.rpc('get_events_within_radius', {
      center_lat: lat,
      center_lng: lng,
      radius_km: 10, // 10km radius
    });

    if (error) {
        console.error("Error fetching events:", error);
    } else {
        console.log("Fetched events:", data?.length);
        setEvents(data || []);
    }
  }

  async function handleJoinVibe(event: Event) {
    if (!user || !profile) {
        Alert.alert("Please login first");
        return;
    }

    if (event.creator_id === user.id) {
        Alert.alert("Your Vibe", "This is your own joda. Go to 'My Vibe' to manage it.");
        return;
    }

    // 1. Check if chat already exists
    // We search for a chat with this event_id AND where I am a participant
    const { data: existingChats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('event_id', event.id)
        .contains('participant_ids', [user.id]);
    
    if (existingChats && existingChats.length > 0) {
        router.push(`/chat/${existingChats[0].id}`);
        return;
    }

    // 2. Check Limits if creating new chat
    if (profile.subscription_type === 'free') {
         if (profile.chats_started_today >= 5) {
             Alert.alert(
                 "Vibe Premium Required", 
                 "You've started 5 new chats recently. Upgrade to Vibe Premium ($5/mo) for unlimited chats and more visibility!",
                 [
                     { text: "Maybe Later", style: "cancel" },
                     { text: "Get Premium", onPress: () => Alert.alert("Coming Soon", "Payments not integrated yet!") }
                 ]
             );
             return;
         }
    }

    // 3. Create Chat
    // Fetch event members (hosts/co-hosts) to include in the chat
    const { data: eventMembers } = await supabase
        .from('event_members')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'accepted');
    
    const memberIds = eventMembers ? eventMembers.map(m => m.user_id) : [];
    
    // Construct participants: [Me, Creator, ...Members]
    // Use Set to ensure uniqueness
    const participantIds = Array.from(new Set([user.id, event.creator_id, ...memberIds]));

    const { data: newChat, error } = await supabase.from('chats').insert({
        event_id: event.id,
        participant_ids: participantIds,
        last_message_at: new Date()
    }).select().single();

    if (error) {
        Alert.alert("Error", "Could not start chat");
        console.error(error);
        return;
    }

    if (newChat) {
        // Increment count locally and in DB
        // We update the profile count. In a real app, this should be a secure RPC or Trigger.
        // NOTE: This might fail if RLS for profiles doesn't allow update.
        // If it fails, we just ignore it for now to not block the chat.
        const { error: profileError } = await supabase.from('profiles').update({ 
            chats_started_today: (profile.chats_started_today || 0) + 1 
        }).eq('id', user.id);
        
        if (profileError) console.warn("Could not update chat count:", profileError);

        await refreshProfile();
        
        router.push(`/chat/${newChat.id}`);
    }
  }

  return (
    <View className="flex-1 bg-vibe-black">
      {location ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          customMapStyle={neonMapStyle}
          initialCamera={{
            center: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            pitch: 75,
            heading: 0,
            altitude: 200, // Lower altitude for better 3D effect
            zoom: 17,
          }}
          pitchEnabled={true}
          rotateEnabled={true}
          zoomEnabled={true}
          scrollEnabled={true}
          showsBuildings={true}
          showsUserLocation
          showsMyLocationButton
          showsCompass={false}
          toolbarEnabled={false}
        >
          {events.map((event) => {
             const coords = event.location?.coordinates || [0,0];
             const lng = coords[0];
             const lat = coords[1];
             
             return (
                <Marker
                  key={event.id}
                  coordinate={{
                    latitude: lat,
                    longitude: lng,
                  }}
                  pinColor={event.privacy === 'secret' ? '#FF00FF' : '#00FFFF'}
                >
                    <Callout tooltip onPress={() => handleJoinVibe(event)}>
                        <View className="bg-black/90 p-4 rounded-xl border border-vibe-cyan w-64 shadow-lg shadow-vibe-cyan/50">
                            {event.photos && event.photos.length > 0 && (
                                <Image 
                                    source={{ uri: event.photos[0] }} 
                                    className="w-full h-32 rounded-lg mb-2"
                                    resizeMode="cover"
                                />
                            )}
                            <Text className="text-vibe-white font-bold text-lg mb-1">{event.title}</Text>
                            <Text className="text-gray-300 text-xs mb-3" numberOfLines={2}>{event.description}</Text>
                            
                            <View className="bg-vibe-magenta py-2 rounded-full items-center">
                                <Text className="text-white font-bold text-xs uppercase">Chat Now</Text>
                            </View>
                        </View>
                    </Callout>
                </Marker>
             );
          })}
        </MapView>
      ) : (
        <View className="flex-1 justify-center items-center">
            <Text className="text-vibe-cyan">Loading Vibe Map...</Text>
        </View>
      )}
      
      <TouchableOpacity 
        className="absolute bottom-8 right-8 bg-vibe-magenta p-4 rounded-full shadow-lg shadow-vibe-magenta/50 z-50"
        onPress={() => router.push('/create-event')}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const neonMapStyle = [
  // 1. GLOBAL RESET: Make everything black by default
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  // 2. BUILDINGS ONLY (Override black with Neon Purple)
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#852eff"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#000000"
      },
      {
        "weight": 3
      }
    ]
  },
  // 3. POIs (Business, etc) - Ensure they inherit purple or are specific
  {
    "featureType": "poi",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#852eff"
      }
    ]
  },
  
  // 4. LABELS & TEXT
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#00ffff"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#000000"
      },
      {
        "weight": 4
      }
    ]
  },
  // 5. PARKS & WATER (Specific colors)
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#00ff00"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#000055"
      }
    ]
  },
  // 6. ROADS
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#00ffff"
      },
      {
        "weight": 1
      }
    ]
  }
];
