import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function Onboarding() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth(); // Destructure refreshProfile

  const handleVerification = async () => {
    if (!user) return;

    // Simulate verification process
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Error verifying profile');
    } else {
      await refreshProfile(); // Refresh profile state locally
      Alert.alert('Verification Successful!', 'Welcome to Vibe.');
      // Force redirect to main tabs
      router.replace('/(tabs)');
    }
  };

  return (
    <View className="flex-1 bg-vibe-black justify-center items-center px-8">
      <Text className="text-vibe-white text-3xl font-bold mb-4 text-center">Verify Identity</Text>
      <Text className="text-gray-400 text-center mb-8">
        To ensure safety, we need to verify your identity. Please upload your ID and take a selfie.
      </Text>

      <TouchableOpacity 
        className="bg-zinc-800 p-6 rounded-lg border border-dashed border-vibe-cyan mb-4 w-full items-center"
        onPress={() => Alert.alert('Camera feature coming soon')}
      >
        <Text className="text-vibe-cyan font-bold">Upload ID</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="bg-zinc-800 p-6 rounded-lg border border-dashed border-vibe-magenta mb-8 w-full items-center"
        onPress={() => Alert.alert('Camera feature coming soon')}
      >
        <Text className="text-vibe-magenta font-bold">Take Selfie</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="bg-vibe-white w-full p-4 rounded-lg"
        onPress={handleVerification}
      >
        <Text className="text-vibe-black text-center font-bold text-lg">Complete Verification (Dev Bypass)</Text>
      </TouchableOpacity>
    </View>
  );
}
