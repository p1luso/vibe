import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Image, ActivityIndicator, Modal, Switch, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { neonMapStyle } from '@/constants/MapStyles';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateEventModal() {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState<any>(null); // { latitude, longitude }
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'secret'>('public');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  
  // New features state
  const [searchQuery, setSearchQuery] = useState('');
  const [is3D, setIs3D] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const mapRef = useRef<MapView>(null);
  
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
        // Default to user location
        setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    
    try {
        const result = await Location.geocodeAsync(searchQuery);
        if (result && result.length > 0) {
            const { latitude, longitude } = result[0];
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            mapRef.current?.animateToRegion(newRegion, 1000);
            setLocation({ latitude, longitude });
        } else {
            Alert.alert("Location not found", "Try a more specific address");
        }
    } catch (e) {
        Alert.alert("Error searching", "Could not find location");
    }
  };

  const toggle3D = () => {
    const nextIs3D = !is3D;
    setIs3D(nextIs3D);
    if (location) {
        mapRef.current?.animateCamera({
            pitch: nextIs3D ? 75 : 0,
            heading: nextIs3D ? 0 : 0,
            altitude: nextIs3D ? 200 : 1000,
            zoom: nextIs3D ? 18 : 15
        }, { duration: 500 });
    }
  };

  const pickImage = async () => {
    if (photos.length >= 3) {
        Alert.alert("Max 3 photos");
        return;
    }
     try {
         const result = await ImagePicker.launchImageLibraryAsync({
             mediaTypes: ImagePicker.MediaTypeOptions.Images,
             allowsEditing: true,
             aspect: [1, 1],
             quality: 0.7,
         });
 
         if (!result.canceled) {
             setPhotos([...photos, result.assets[0].uri]);
         }
     } catch (e) {
         Alert.alert("Error picking image");
     }
  };

  const removePhoto = (index: number) => {
      const newPhotos = [...photos];
      newPhotos.splice(index, 1);
      setPhotos(newPhotos);
  };

  const uploadImages = async (): Promise<string[]> => {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < photos.length; i++) {
          const uri = photos[i];
          try {
              const manipResult = await ImageManipulator.manipulateAsync(
                  uri,
                  [{ resize: { width: 800 } }],
                  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );

              const response = await fetch(manipResult.uri);
              const blob = await response.blob();
              const arrayBuffer = await new Response(blob).arrayBuffer();
              
              const fileName = `${user?.id}/${Date.now()}_${i}.jpg`;
              
              const { error: uploadError } = await supabase.storage
                .from('event_photos')
                .upload(fileName, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('event_photos')
                .getPublicUrl(fileName);
                
              uploadedUrls.push(publicUrl);
          } catch (e) {
              console.error("Error uploading photo index " + i, e);
              // Continue with other photos or fail? Fail for now to ensure consistency
              throw e;
          }
      }
      return uploadedUrls;
  };

  const handleNext = () => {
    if (step === 1 && !location) {
        Alert.alert('Please select a location');
        return;
    }
    if (step === 2) {
        if (!title || !description) {
            Alert.alert('Please fill in title and description');
            return;
        }
        if (isScheduled && scheduledDate < new Date()) {
             Alert.alert('Please pick a future date/time');
             return;
        }
    }
    setStep(step + 1);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      const currentDate = selectedDate || scheduledDate;
      if (Platform.OS === 'android') {
          setShowDatePicker(false);
      }
      setScheduledDate(currentDate);
      
      // If we just picked a date on Android, show time picker next
      if (Platform.OS === 'android' && event.type === 'set' && showDatePicker) {
          setShowTimePicker(true);
      }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      const currentDate = selectedDate || scheduledDate;
      if (Platform.OS === 'android') {
          setShowTimePicker(false);
      }
      setScheduledDate(currentDate);
  };

  const handleCreate = async () => {
    if (!user) {
        Alert.alert('Error', 'You must be logged in to create a vibe.');
        return;
    }

    setLoading(true);
    
    try {
        const startTime = isScheduled ? scheduledDate.toISOString() : new Date().toISOString();
        const endTime = new Date(new Date(startTime).getTime() + 9 * 60 * 60 * 1000).toISOString();

        const { data: conflictingEvents } = await supabase
            .from('events')
            .select('id')
            .eq('creator_id', user.id)
            .gte('start_time', new Date(new Date(startTime).getTime() - 9 * 60 * 60 * 1000).toISOString()) // Starts within 9h before
            .lt('start_time', endTime); // Starts before this one ends

        if (conflictingEvents && conflictingEvents.length > 0) {
            Alert.alert("Vibe Overlap", "You already have an active vibe scheduled for this time. You can't host two parties at once!");
            setLoading(false);
            return;
        }

        // Upload images first
        const photoUrls = await uploadImages();

        // Create event
        const { data, error } = await supabase.from('events').insert({
            creator_id: user.id,
            title,
            description,
            privacy,
            location: `SRID=4326;POINT(${location.longitude} ${location.latitude})`,
            radius_meters: 500,
            photos: photoUrls,
            start_time: startTime
        }).select();
    
        if (error) throw error;
    
        console.log("Event created successfully:", data);
        Alert.alert('Vibe Created!', 'Your joda is live.');
        router.back();

    } catch (e: any) {
        console.error("Create Event Error:", e);
        Alert.alert('Error creating event', e.message || "Unknown error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-vibe-black p-4">
      <View className="flex-row justify-between items-center mb-4 mt-2">
        <Text className="text-vibe-white text-xl font-bold">Create Vibe - Step {step}/3</Text>
        <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-vibe-cyan">Cancel</Text>
        </TouchableOpacity>
      </View>

      {step === 1 && (
        <View className="flex-1">
            <View className="flex-row gap-2 mb-2">
                <TextInput 
                    className="flex-1 bg-zinc-900 text-white p-3 rounded-lg border border-zinc-700"
                    placeholder="Search location (e.g. Entre Rios 1668)"
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchLocation}
                />
                <TouchableOpacity 
                    className="bg-vibe-cyan p-3 rounded-lg justify-center"
                    onPress={handleSearchLocation}
                >
                    <Ionicons name="search" size={20} color="black" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 relative rounded-xl overflow-hidden">
                {userLocation ? (
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={neonMapStyle}
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        onPress={(e) => setLocation(e.nativeEvent.coordinate)}
                        showsBuildings={true}
                        pitchEnabled={true}
                    >
                        {location && <Marker coordinate={location} pinColor="#00FFFF" />}
                    </MapView>
                ) : (
                    <View className="flex-1 justify-center items-center bg-zinc-900">
                        <Text className="text-gray-500">Loading Map...</Text>
                    </View>
                )}
                
                <TouchableOpacity 
                    className="absolute bottom-4 right-4 bg-black/80 p-3 rounded-full border border-vibe-cyan"
                    onPress={toggle3D}
                >
                    <Text className="text-vibe-cyan font-bold">{is3D ? "2D" : "3D"}</Text>
                </TouchableOpacity>
            </View>

             <TouchableOpacity 
                className="bg-vibe-cyan mt-4 p-4 rounded-lg"
                onPress={handleNext}
            >
                <Text className="text-black text-center font-bold">Next</Text>
            </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
             <Text className="text-gray-400 mb-2">Details</Text>
             <TextInput
                className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-zinc-700 mb-4"
                placeholder="Title (e.g., Mates Chill)"
                placeholderTextColor="#666"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-zinc-700 mb-4 h-32"
                placeholder="Description"
                placeholderTextColor="#666"
                value={description}
                onChangeText={setDescription}
                multiline
            />
            
            <View className="mb-6 bg-zinc-900 p-4 rounded-lg border border-zinc-700">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-400">Schedule Vibe?</Text>
                    <Switch 
                        value={isScheduled} 
                        onValueChange={(val) => {
                            setIsScheduled(val);
                            if(val) setShowTimeModal(true);
                        }}
                        trackColor={{ false: "#333", true: "#00FFFF" }}
                        thumbColor={isScheduled ? "#fff" : "#f4f3f4"}
                    />
                </View>
                {isScheduled ? (
                    <View>
                        <Text className="text-vibe-cyan mb-2">Starts on:</Text>
                        
                        {Platform.OS === 'android' ? (
                            <View className="flex-row gap-2">
                                <TouchableOpacity 
                                    className="flex-1 bg-black p-3 rounded border border-zinc-600 items-center"
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text className="text-white">{scheduledDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    className="flex-1 bg-black p-3 rounded border border-zinc-600 items-center"
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text className="text-white">{scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="bg-black rounded-lg border border-zinc-700 overflow-hidden">
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={scheduledDate}
                                    mode="datetime"
                                    is24Hour={true}
                                    display="spinner"
                                    onChange={onDateChange}
                                    textColor="white"
                                    themeVariant="dark"
                                    minimumDate={new Date()}
                                />
                            </View>
                        )}
                        
                        {(showDatePicker || showTimePicker) && Platform.OS === 'android' && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={scheduledDate}
                                mode={showDatePicker ? 'date' : 'time'}
                                is24Hour={true}
                                display="default"
                                onChange={showDatePicker ? onDateChange : onTimeChange}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>
                ) : (
                    <Text className="text-vibe-cyan font-bold">Starts Immediately</Text>
                )}
            </View>

            <Text className="text-gray-400 mb-2">Photos (Max 3)</Text>
            <View className="flex-row gap-2 mb-6">
                {photos.map((uri, index) => (
                    <View key={index} className="w-24 h-24 relative">
                        <Image source={{ uri }} className="w-full h-full rounded-lg" />
                        <TouchableOpacity 
                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                            onPress={() => removePhoto(index)}
                        >
                            <Ionicons name="close" size={12} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
                {photos.length < 3 && (
                    <TouchableOpacity 
                        className="w-24 h-24 bg-zinc-900 rounded-lg border border-dashed border-zinc-600 justify-center items-center"
                        onPress={pickImage}
                    >
                        <Ionicons name="camera" size={24} color="#666" />
                        <Text className="text-gray-500 text-xs mt-1">Add Photo</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text className="text-gray-400 mb-2">Privacy</Text>
            <View className="flex-row gap-4 mb-8">
                <TouchableOpacity 
                    className={`flex-1 p-4 rounded-lg border ${privacy === 'public' ? 'bg-vibe-cyan/20 border-vibe-cyan' : 'bg-zinc-900 border-zinc-700'}`}
                    onPress={() => setPrivacy('public')}
                >
                    <Text className={`text-center font-bold ${privacy === 'public' ? 'text-vibe-cyan' : 'text-gray-500'}`}>Public</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    className={`flex-1 p-4 rounded-lg border ${privacy === 'secret' ? 'bg-vibe-magenta/20 border-vibe-magenta' : 'bg-zinc-900 border-zinc-700'}`}
                    onPress={() => setPrivacy('secret')}
                >
                    <Text className={`text-center font-bold ${privacy === 'secret' ? 'text-vibe-magenta' : 'text-gray-500'}`}>Secret</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                className="bg-vibe-cyan mt-auto p-4 rounded-lg mb-8"
                onPress={handleNext}
            >
                <Text className="text-black text-center font-bold">Next</Text>
            </TouchableOpacity>
        </ScrollView>
      )}

      {step === 3 && (
        <View className="flex-1">
            <Text className="text-gray-400 mb-4">Confirm & Publish</Text>
            
            <View className="bg-zinc-900 p-6 rounded-lg border border-zinc-700 mb-8">
                <Text className="text-vibe-white text-xl font-bold mb-2">{title}</Text>
                <Text className="text-gray-400 mb-4">{description}</Text>
                
                <View className="mb-4">
                     <Text className="text-gray-500 text-xs">WHEN</Text>
                     <Text className="text-vibe-white font-bold">
                        {isScheduled ? scheduledDate.toLocaleString() : "Right Now!"}
                     </Text>
                </View>

                {photos.length > 0 && (
                    <ScrollView horizontal className="mb-4" showsHorizontalScrollIndicator={false}>
                        {photos.map((uri, index) => (
                            <Image key={index} source={{ uri }} className="w-16 h-16 rounded-md mr-2" />
                        ))}
                    </ScrollView>
                )}

                <View className="flex-row gap-2">
                    <Text className={`text-xs font-bold px-2 py-1 rounded ${privacy === 'public' ? 'bg-vibe-cyan/20 text-vibe-cyan' : 'bg-vibe-magenta/20 text-vibe-magenta'}`}>
                        {privacy.toUpperCase()}
                    </Text>
                </View>
            </View>

            <TouchableOpacity 
                className="bg-zinc-800 p-4 rounded-lg border border-dashed border-zinc-600 mb-8"
                onPress={() => Alert.alert('Invite feature coming soon')}
            >
                <Text className="text-gray-400 text-center">+ Invite Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                className="bg-vibe-magenta mt-auto p-4 rounded-lg shadow-lg shadow-vibe-magenta/50"
                onPress={handleCreate}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-center font-bold text-lg">Create Vibe</Text>
                )}
            </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-6">
            <View className="bg-zinc-900 p-6 rounded-2xl w-full border border-vibe-magenta">
                <Text className="text-vibe-white text-xl font-bold mb-4 text-center">⏳ Good to know</Text>
                <Text className="text-gray-300 text-center mb-6">
                    All Vibes automatically close <Text className="text-vibe-magenta font-bold">9 hours</Text> after they start.
                    {"\n\n"}
                    This keeps the map fresh and full of active jodas!
                </Text>
                <TouchableOpacity 
                    className="bg-vibe-magenta p-4 rounded-lg"
                    onPress={() => setShowTimeModal(false)}
                >
                    <Text className="text-white font-bold text-center">Got it</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
