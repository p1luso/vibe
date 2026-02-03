import { StyleSheet, View, Text, Alert, TouchableOpacity, Modal, Image, Platform, FlatList } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { neonMapStyle } from '@/constants/MapStyles';
import { WebView } from 'react-native-webview';

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [is3D, setIs3D] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [myGroups, setMyGroups] = useState<any[]>([]);

  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [searchAreaVisible, setSearchAreaVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState<any>(null);

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

  // Force 3D pitch
  useEffect(() => {
    if (location && mapRef.current) {
        // Initial fetch based on user location
        fetchEvents(location.coords.latitude, location.coords.longitude);

        setTimeout(() => {
            mapRef.current?.animateCamera({
                center: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                },
                pitch: is3D ? 65 : 0,
                heading: 0,
                altitude: is3D ? 150 : 1000,
                zoom: is3D ? 18 : 15
            }, { duration: 1000 });
        }, 500);
    }
  }, [location]);

  const toggle3D = () => {
    const nextIs3D = !is3D;
    setIs3D(nextIs3D);
    if (location) {
        mapRef.current?.animateCamera({
            pitch: nextIs3D ? 65 : 0,
            heading: nextIs3D ? 0 : 0,
            altitude: nextIs3D ? 150 : 1000,
            zoom: nextIs3D ? 18 : 15
        }, { duration: 500 });
    }
  };

  useFocusEffect(
    useCallback(() => {
        // Refresh events if we have a location or if the user searched an area
        if (mapRegion) {
             fetchEvents(mapRegion.latitude, mapRegion.longitude);
        } else if (location) {
             fetchEvents(location.coords.latitude, location.coords.longitude);
        }
    }, [location])
  );

  async function fetchEvents(lat: number, lng: number) {
    // Increased radius to 50km to help with visibility, but 'Search This Area' is key
    const { data, error } = await supabase.rpc('get_events_within_radius', {
      center_lat: lat,
      center_lng: lng,
      radius_km: 50, 
    });
    if (!error) setEvents(data || []);
    setSearchAreaVisible(false);
  }

  const onRegionChangeComplete = (region: any) => {
      setMapRegion(region);
      setSearchAreaVisible(true);
  };

  const handleSearchArea = () => {
      if (mapRegion) {
          fetchEvents(mapRegion.latitude, mapRegion.longitude);
      }
  };

  async function fetchMyGroups() {
      if (!user) return;
      const { data, error } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', user.id);
      
      if (data) {
          setMyGroups(data.map((item: any) => item.groups).filter(Boolean));
      }
  }

  const handleCalloutPress = (event: Event) => {
      if (!user) {
          Alert.alert("Please login first");
          return;
      }
      router.push(`/event/${event.id}`);
  };

  const joinChat = async (asGroupId?: string) => {
    if (!selectedEvent || !user) return;

    // 1. Determine participants
    let participantIds = [user.id, selectedEvent.creator_id];

    if (asGroupId) {
        // Fetch group members
        const { data: groupMembers } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', asGroupId);
        
        if (groupMembers) {
            const memberIds = groupMembers.map(m => m.user_id);
            participantIds = [...participantIds, ...memberIds];
        }
    }

    // Add event members (hosts)
    const { data: eventMembers } = await supabase
        .from('event_members')
        .select('user_id')
        .eq('event_id', selectedEvent.id);
    
    if (eventMembers) {
        participantIds = [...participantIds, ...eventMembers.map(m => m.user_id)];
    }

    // Unique
    participantIds = Array.from(new Set(participantIds));

    // 2. Create or Get Chat
    // Simple logic: Create new chat always for now or check existing
    // If joining as group, we likely want a new chat context or merge?
    // Let's create a new chat for simplicity of MVP "Group Join"
    
    const { data: newChat, error } = await supabase.from('chats').insert({
        event_id: selectedEvent.id,
        participant_ids: participantIds,
        last_message_at: new Date()
    }).select().single();

    if (error) {
        Alert.alert("Error joining");
        return;
    }

    setShowJoinModal(false);
    router.push(`/chat/${newChat.id}`);
  };

  return (
    <View className="flex-1 bg-vibe-black">
      {location ? (
        <View style={StyleSheet.absoluteFill}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                customMapStyle={neonMapStyle}
                initialCamera={{
                    center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
                    pitch: 75, heading: 0, altitude: 200, zoom: 17,
                }}
                pitchEnabled={true} showsBuildings={true} showsUserLocation showsMyLocationButton={false} showsCompass={false} toolbarEnabled={false}
                onRegionChangeComplete={onRegionChangeComplete}
            >
            {events.map((event) => {
                const coords = event.location?.coordinates || [0,0];
                return (
                    <Marker
                        key={event.id}
                        coordinate={{ latitude: coords[1], longitude: coords[0] }}
                        pinColor={event.privacy === 'secret' ? '#FF00FF' : '#00FFFF'}
                    >
                        <View className="items-center">
                            <View className={`w-12 h-12 rounded-full border-4 ${event.privacy === 'secret' ? 'bg-vibe-magenta border-white' : 'bg-vibe-cyan border-black'} justify-center items-center shadow-lg shadow-black/50`}>
                                <Ionicons name="musical-notes" size={24} color={event.privacy === 'secret' ? 'white' : 'black'} />
                            </View>
                            <View className={`w-2 h-2 rounded-full mt-1 ${event.privacy === 'secret' ? 'bg-vibe-magenta' : 'bg-vibe-cyan'}`} />
                        </View>

                        <Callout tooltip onPress={() => handleCalloutPress(event)}>
                            <View className="bg-black/90 p-4 rounded-xl border border-vibe-cyan w-64 shadow-lg shadow-vibe-cyan/50">
                                {event.photos && event.photos.length > 0 && (
                                    <View className="w-full h-32 rounded-lg mb-2 overflow-hidden bg-zinc-800">
                                        {Platform.OS === 'android' ? (
                                            <WebView source={{ uri: event.photos[0] }} style={{ width: '100%', height: '100%' }} scrollEnabled={false} />
                                        ) : (
                                            <Image source={{ uri: event.photos[0] }} className="w-full h-full" resizeMode="cover" />
                                        )}
                                    </View>
                                )}
                                <Text className="text-vibe-white font-bold text-lg mb-1">{event.title}</Text>
                                <Text className="text-gray-300 text-xs mb-3" numberOfLines={2}>{event.description}</Text>
                                <View className="bg-vibe-magenta py-2 rounded-full items-center">
                                    <Text className="text-white font-bold text-xs uppercase">Check Vibe</Text>
                                </View>
                            </View>
                        </Callout>
                    </Marker>
                );
            })}
            </MapView>
            
            {searchAreaVisible && (
                <View className="absolute top-12 left-0 right-0 items-center z-50">
                    <TouchableOpacity 
                        className="bg-black/80 px-6 py-3 rounded-full border border-vibe-cyan flex-row items-center shadow-lg shadow-black"
                        onPress={handleSearchArea}
                    >
                        <Ionicons name="search" size={16} color="#00FFFF" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold">Search this area</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity className="absolute top-12 right-4 bg-black/80 p-3 rounded-full border border-vibe-cyan" onPress={toggle3D}>
                <Text className="text-vibe-cyan font-bold">{is3D ? "2D" : "3D"}</Text>
            </TouchableOpacity>

            <TouchableOpacity className="absolute top-28 right-4 bg-black/80 p-3 rounded-full border border-vibe-cyan" onPress={() => {
                if (location && mapRef.current) {
                    mapRef.current.animateCamera({ center: { latitude: location.coords.latitude, longitude: location.coords.longitude }, zoom: 18, pitch: is3D ? 65 : 0 });
                }
            }}>
                <Ionicons name="locate" size={20} color="#00FFFF" />
            </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center"><Text className="text-vibe-cyan">Loading Vibe Map...</Text></View>
      )}
      
      <TouchableOpacity className="absolute bottom-8 right-8 bg-vibe-magenta p-4 rounded-full shadow-lg shadow-vibe-magenta/50 z-50" onPress={() => router.push('/create-event')}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal visible={showJoinModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
              <View className="bg-vibe-black p-6 rounded-t-3xl border-t border-vibe-cyan h-2/3">
                  <View className="flex-row justify-between items-center mb-6">
                      <Text className="text-white text-2xl font-bold">Join {selectedEvent?.title}</Text>
                      <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                          <Ionicons name="close" size={24} color="white" />
                      </TouchableOpacity>
                  </View>

                  <Text className="text-gray-400 mb-4">How do you want to pull up?</Text>

                  <TouchableOpacity 
                      className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 mb-6 flex-row items-center"
                      onPress={() => joinChat()}
                  >
                      <View className="w-12 h-12 bg-vibe-cyan rounded-full justify-center items-center mr-4">
                          <Ionicons name="person" size={24} color="black" />
                      </View>
                      <View>
                          <Text className="text-white font-bold text-lg">Solo</Text>
                          <Text className="text-gray-400">Just me, myself and I</Text>
                      </View>
                  </TouchableOpacity>

                  <Text className="text-gray-400 mb-2 font-bold uppercase">Or with a Squad</Text>
                  
                  <FlatList
                      data={myGroups}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                          <TouchableOpacity 
                              className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-3 flex-row items-center"
                              onPress={() => joinChat(item.id)}
                          >
                                <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/50' }} className="w-10 h-10 rounded-full mr-4" />
                                <View>
                                    <Text className="text-white font-bold">{item.name}</Text>
                                    <Text className="text-gray-500 text-xs">{item.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#666" style={{ marginLeft: 'auto' }} />
                          </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                          <Text className="text-gray-500 text-center py-4">You don't have any groups yet.</Text>
                      }
                  />
              </View>
          </View>
      </Modal>
    </View>
  );
}
