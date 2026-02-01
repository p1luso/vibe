import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    if (!email || !password || !name || !age) {
      Alert.alert('Please fill in all fields');
      return;
    }

    if (parseInt(age) < 18) {
      Alert.alert('You must be 18+ to use Vibe');
      return;
    }

    setLoading(true);
    
    // Sign up
    const { data: { session, user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          age: age,
        }
      }
    });

    if (error) {
      Alert.alert(error.message);
      setLoading(false);
      return;
    }

    if (user) {
         if (!session) {
              Alert.alert(
                  "Verify your email", 
                  "Account created! Please check your email to verify your account.",
                  [
                      { text: "Go to Login", onPress: () => router.replace('/(auth)/login') },
                      { text: "Resend Email", onPress: async () => {
                          const { error: resendError } = await supabase.auth.resend({
                              type: 'signup',
                              email: email,
                          });
                          if (resendError) Alert.alert("Error", resendError.message);
                          else Alert.alert("Sent", "Verification email resent.");
                      }}
                  ]
              );
         } else {
             // Session exists, auto-login successful
             router.replace('/(auth)/onboarding');
         }
    } else {
        // Should not happen if no error, but fallback
        Alert.alert('Error', 'Could not create user');
    }

    setLoading(false);
  }

  return (
    <View className="flex-1 bg-vibe-black justify-center px-8">
      <Text className="text-vibe-white text-4xl font-bold mb-8 text-center text-shadow-neon-magenta">JOIN VIBE</Text>
      
      <View className="mb-4">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-magenta"
          placeholder="Full Name"
          placeholderTextColor="#666"
          onChangeText={setName}
          value={name}
        />
      </View>

      <View className="mb-4">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-magenta"
          placeholder="Age"
          placeholderTextColor="#666"
          onChangeText={setAge}
          value={age}
          keyboardType="numeric"
        />
      </View>

      <View className="mb-4">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-magenta"
          placeholder="Email"
          placeholderTextColor="#666"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
        />
      </View>
      
      <View className="mb-8">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-magenta"
          placeholder="Password"
          placeholderTextColor="#666"
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity 
        className="bg-vibe-magenta p-4 rounded-lg shadow-lg shadow-vibe-magenta/50"
        onPress={signUpWithEmail}
        disabled={loading}
      >
        <Text className="text-vibe-black text-center font-bold text-lg">
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-gray-400">Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text className="text-vibe-cyan font-bold">Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
