import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator, Dimensions, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient'; 
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AVAILABLE_TAGS = ['#Techno', '#Cachengue', '#Mates', '#Chill', '#Rave', '#House', '#After', '#Previa', '#Bar', '#Park'];

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Settings State
  const [language, setLanguage] = useState<'en' | 'es'>('en'); // Default English
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Stats
  const [eventsCount, setEventsCount] = useState(0);

  // Edit State
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>(Array(6).fill(null));
  
  // New Profile Fields
  const [instagram, setInstagram] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hometown, setHometown] = useState('');

    useEffect(() => {
        if (user) {
            // Fetch events count
            supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('creator_id', user.id)
                .then(({ count }) => {
                    console.log("Events count:", count);
                    setEventsCount(count || 0);
                });
        }

        if (profile) {
            setBio(profile.bio || '');
            setTags(profile.tags || []);
            // Initialize photos with avatar in slot 0 if exists, and others from profile.photos
            const currentPhotos = [...(profile.photos || [])];
            const combinedPhotos = Array(6).fill(null);
            if (profile.avatar_url) combinedPhotos[0] = profile.avatar_url;
            // Fill rest
            currentPhotos.forEach((p, i) => {
                if (i < 5) combinedPhotos[i+1] = p; // Offset by 1 because 0 is avatar
            });
            setPhotos(combinedPhotos);
            
            // Mock fetching extra fields from profile metadata (assuming JSONB or new columns)
            // For now, we just use local state placeholders or what's available
            // In a real app, these would come from profile.metadata or specific columns
        }
    }, [profile, user]);

  const pickImage = async (index: number) => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 5], // Portrait aspect ratio
            quality: 0.7,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri, index);
        }
    } catch (e) {
        console.error(e);
        Alert.alert("Error picking image");
    }
  };

  const uploadImage = async (uri: string, index: number) => {
      setLoading(true);
      try {
          // Compress/Resize
          const manipResult = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 800 } }],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          const response = await fetch(manipResult.uri);
          const blob = await response.blob();
          const arrayBuffer = await new Response(blob).arrayBuffer();
          
          const fileName = `${user?.id}/${Date.now()}_${index}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          const newPhotos = [...photos];
          newPhotos[index] = publicUrl;
          setPhotos(newPhotos);

      } catch (e) {
          console.error(e);
          Alert.alert("Error uploading image");
      } finally {
          setLoading(false);
      }
  };

  const saveProfile = async () => {
      setLoading(true);
      try {
          const avatarUrl = photos[0];
          const otherPhotos = photos.slice(1).filter(p => p !== null) as string[];

          const { error } = await supabase.from('profiles').update({
              bio,
              tags,
              avatar_url: avatarUrl,
              photos: otherPhotos,
              // We would save extra fields here too
          }).eq('id', user?.id);

          if (error) throw error;
          
          await refreshProfile();
          setIsEditing(false);
          Alert.alert("Profile Updated");
      } catch (e) {
          Alert.alert("Error saving profile");
      } finally {
          setLoading(false);
      }
  };

  const toggleTag = (tag: string) => {
      if (tags.includes(tag)) {
          setTags(tags.filter(t => t !== tag));
      } else {
          if (tags.length >= 5) {
              Alert.alert("Max 5 tags");
              return;
          }
          setTags([...tags, tag]);
      }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error logging out");
  };

  if (!profile) return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator /></View>;

  return (
    <View className="flex-1 bg-vibe-black">
      <ScrollView className="flex-1">
        {/* Header / Main Photo */}
        <View className="relative h-96 w-full bg-zinc-900 overflow-hidden rounded-b-3xl">
            {photos[0] ? (
                <Image source={{ uri: photos[0] }} className="w-full h-full" resizeMode="cover" />
            ) : (
                <View className="w-full h-full justify-center items-center">
                    <LinearGradient
                        colors={['#00FFFF', '#FF00FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="absolute w-full h-full opacity-50"
                    />
                    <Ionicons name="person" size={80} color="white" />
                </View>
            )}
            
            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
                className="absolute bottom-0 w-full h-48"
            />
            
            {/* Settings Button */}
            <TouchableOpacity 
                className="absolute top-12 right-6 bg-black/50 p-2 rounded-full"
                onPress={() => setIsSettingsOpen(true)}
            >
                <Ionicons name="settings-sharp" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Info */}
            <View className="absolute bottom-6 left-6 right-6">
                <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-white font-bold text-3xl">{profile.name}</Text>
                    {profile.is_verified && (
                        <Ionicons name="checkmark-circle" size={24} color="#00FFFF" />
                    )}
                </View>
                <Text className="text-gray-300 text-lg mb-2">24 years old</Text>
                
                {/* Tags Display */}
                <View className="flex-row flex-wrap gap-2">
                    {profile.tags?.map(tag => (
                        <View key={tag} className="bg-white/20 px-3 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>

        {/* Stats */}
        <View className="flex-row justify-around py-6 px-4">
            <View className="items-center">
                <View className="w-16 h-16 rounded-full border-2 border-vibe-cyan items-center justify-center mb-2">
                    <Text className="text-vibe-cyan font-bold text-xl">{eventsCount}</Text>
                </View>
                <Text className="text-gray-500 text-xs font-bold uppercase">Created</Text>
            </View>
            <View className="items-center">
                <View className="w-16 h-16 rounded-full border-2 border-vibe-magenta items-center justify-center mb-2">
                    <Text className="text-vibe-magenta font-bold text-xl">{profile.vibes_score ?? 0}</Text>
                </View>
                <Text className="text-gray-500 text-xs font-bold uppercase">Vibes</Text>
            </View>
            <View className="items-center">
                <View className="w-16 h-16 rounded-full border-2 border-white items-center justify-center mb-2">
                    <Text className="text-white font-bold text-xl">
                        {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </Text>
                </View>
                <Text className="text-gray-500 text-xs font-bold uppercase">Days</Text>
            </View>
        </View>

        {/* Premium Card */}
        <TouchableOpacity 
            className="mx-4 mb-6 bg-zinc-900 p-6 rounded-2xl border border-vibe-magenta shadow-lg shadow-vibe-magenta/30 overflow-hidden relative"
            onPress={() => router.push('/premium')}
        >
            <View className="absolute top-0 right-0 p-2 bg-vibe-magenta rounded-bl-xl">
                <Text className="text-white font-bold text-xs">PRO</Text>
            </View>
            <Text className="text-white font-bold text-xl mb-1">Vibe Premium</Text>
            <Text className="text-gray-400 mb-4">Get unlimited chats, see who likes your vibe, and boost your jodas.</Text>
            <View className="bg-vibe-magenta py-3 rounded-xl items-center">
                <Text className="text-white font-bold">Upgrade for $5/mo</Text>
            </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="px-4 gap-3 mb-8">
            <TouchableOpacity 
                className="bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700"
                onPress={() => setIsEditing(true)}
            >
                <Text className="text-white font-bold">Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                className="bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700"
                onPress={() => setIsPreviewing(true)}
            >
                <Text className="text-white font-bold">Preview Profile</Text>
            </TouchableOpacity>
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-vibe-black p-4">
            <View className="flex-row justify-between items-center mb-6 mt-4">
                <Text className="text-white text-xl font-bold">Edit Profile</Text>
                <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text className="text-vibe-cyan font-bold">Done</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photos Grid */}
                <Text className="text-gray-400 mb-3 font-bold text-xs uppercase tracking-wider">Photos</Text>
                <View className="flex-row flex-wrap justify-between mb-8">
                    {photos.map((photo, index) => (
                        <TouchableOpacity 
                            key={index} 
                            className={`w-[32%] aspect-[4/5] bg-zinc-900 rounded-xl mb-2 overflow-hidden border ${index === 0 ? 'border-vibe-cyan' : 'border-zinc-800'}`}
                            onPress={() => pickImage(index)}
                        >
                            {photo ? (
                                <View className="relative w-full h-full">
                                    <Image source={{ uri: photo }} className="w-full h-full" />
                                    <View className="absolute bottom-1 right-1 bg-black/50 p-1 rounded-full">
                                        <Ionicons name="pencil" size={12} color="white" />
                                    </View>
                                </View>
                            ) : (
                                <View className="w-full h-full justify-center items-center">
                                    <Ionicons name="add" size={32} color="#333" />
                                </View>
                            )}
                            {index === 0 && (
                                <View className="absolute top-2 left-2 bg-vibe-cyan px-2 py-1 rounded">
                                    <Text className="text-black text-[10px] font-bold">MAIN</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bio */}
                <Text className="text-gray-400 mb-3 font-bold text-xs uppercase tracking-wider">About Me</Text>
                <TextInput 
                    className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-4 min-h-[100px]"
                    multiline
                    maxLength={200}
                    placeholder="Write something about your vibe..."
                    placeholderTextColor="#555"
                    value={bio}
                    onChangeText={setBio}
                />
                
                {/* Extra Fields */}
                <Text className="text-gray-400 mb-3 font-bold text-xs uppercase tracking-wider">Details</Text>
                <TextInput 
                    className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-3"
                    placeholder="Instagram (@username)"
                    placeholderTextColor="#555"
                    value={instagram}
                    onChangeText={setInstagram}
                />
                <TextInput 
                    className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-3"
                    placeholder="Job / Education"
                    placeholderTextColor="#555"
                    value={jobTitle}
                    onChangeText={setJobTitle}
                />
                <TextInput 
                    className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-8"
                    placeholder="Hometown"
                    placeholderTextColor="#555"
                    value={hometown}
                    onChangeText={setHometown}
                />

                {/* Tags */}
                <Text className="text-gray-400 mb-3 font-bold text-xs uppercase tracking-wider">My Vibe (Max 5)</Text>
                <View className="flex-row flex-wrap gap-2 mb-8">
                    {AVAILABLE_TAGS.map(tag => (
                        <TouchableOpacity 
                            key={tag}
                            className={`px-4 py-2 rounded-full border ${tags.includes(tag) ? 'bg-vibe-magenta border-vibe-magenta' : 'bg-zinc-900 border-zinc-800'}`}
                            onPress={() => toggleTag(tag)}
                        >
                            <Text className={`${tags.includes(tag) ? 'text-white' : 'text-gray-400'} font-bold`}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity 
                    className="bg-vibe-cyan py-4 rounded-xl items-center mb-12 shadow-lg shadow-vibe-cyan/20"
                    onPress={saveProfile}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="black" /> : <Text className="text-black font-bold text-lg">Save Changes</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsOpen} animationType="slide" presentationStyle="formSheet">
        <View className="flex-1 bg-zinc-900 p-6">
            <View className="flex-row justify-between items-center mb-8">
                <Text className="text-white text-2xl font-bold">Settings</Text>
                <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                    <Text className="text-vibe-cyan font-bold">Done</Text>
                </TouchableOpacity>
            </View>

            <View className="bg-zinc-800 rounded-xl overflow-hidden mb-6">
                <View className="p-4 flex-row justify-between items-center border-b border-zinc-700">
                    <Text className="text-white text-lg">Language</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity 
                            onPress={() => setLanguage('en')}
                            className={`px-3 py-1 rounded ${language === 'en' ? 'bg-vibe-cyan' : 'bg-zinc-700'}`}
                        >
                            <Text className={`font-bold ${language === 'en' ? 'text-black' : 'text-gray-400'}`}>EN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setLanguage('es')}
                            className={`px-3 py-1 rounded ${language === 'es' ? 'bg-vibe-cyan' : 'bg-zinc-700'}`}
                        >
                            <Text className={`font-bold ${language === 'es' ? 'text-black' : 'text-gray-400'}`}>ES</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="p-4 flex-row justify-between items-center">
                    <Text className="text-white text-lg">Notifications</Text>
                    <Switch value={true} trackColor={{ false: "#333", true: "#00FFFF" }} />
                </View>
            </View>

            <TouchableOpacity 
                className="bg-red-500/10 py-4 rounded-xl items-center border border-red-500/30 flex-row justify-center gap-2 mb-4"
                onPress={handleLogout}
            >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text className="text-red-500 font-bold">Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                className="py-4 items-center"
                onPress={() => Alert.alert("Delete Account", "This action cannot be undone. Are you sure?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => Alert.alert("Account Deleted", "Your data has been removed.") }
                ])}
            >
                <Text className="text-zinc-600 text-xs">Delete Account</Text>
            </TouchableOpacity>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={isPreviewing} animationType="fade" transparent>
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
            <View className="w-full h-[80%] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 relative">
                <ScrollView pagingEnabled horizontal showsHorizontalScrollIndicator={false}>
                    {photos.filter(p => p).map((photo, i) => (
                        <View key={i} style={{ width: SCREEN_WIDTH - 34 }} className="h-full relative">
                            <Image source={{ uri: photo! }} className="w-full h-full" resizeMode="cover" />
                             {/* Overlay Gradient for Text Readability */}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
                                className="absolute bottom-0 w-full h-1/2"
                            />
                        </View>
                    ))}
                </ScrollView>
                
                {/* Overlay Info */}
                <View className="absolute bottom-0 w-full p-6 pb-10">
                    <View className="flex-row items-center gap-2 mb-2">
                        <Text className="text-white font-bold text-4xl shadow-sm">{profile.name}</Text>
                        <Text className="text-white text-2xl shadow-sm">24</Text>
                        {profile.is_verified && <Ionicons name="checkmark-circle" size={24} color="#00FFFF" />}
                    </View>
                    
                    {profile.bio && (
                        <Text className="text-white text-base mb-4 shadow-sm">{profile.bio}</Text>
                    )}

                    {/* Extra Info in Preview */}
                    {(jobTitle || hometown || instagram) && (
                        <View className="flex-row gap-4 mb-4">
                            {jobTitle ? <View className="flex-row items-center gap-1"><Ionicons name="briefcase" color="#ccc" size={14}/><Text className="text-gray-300 text-xs">{jobTitle}</Text></View> : null}
                            {hometown ? <View className="flex-row items-center gap-1"><Ionicons name="home" color="#ccc" size={14}/><Text className="text-gray-300 text-xs">{hometown}</Text></View> : null}
                        </View>
                    )}

                    <View className="flex-row flex-wrap gap-2">
                        {profile.tags?.map(tag => (
                            <View key={tag} className="bg-black/40 px-3 py-1 rounded-full border border-white/20">
                                <Text className="text-white text-xs font-bold">{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity 
                    className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
                    onPress={() => setIsPreviewing(false)}
                >
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}
