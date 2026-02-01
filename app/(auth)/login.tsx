import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
        if (error.message.includes("Email not confirmed")) {
            Alert.alert(
                "Email Not Confirmed", 
                "Please check your inbox and click the verification link.",
                [
                    { text: "OK" },
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
            Alert.alert(error.message);
        }
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-vibe-black justify-center px-8">
      <Text className="text-vibe-white text-4xl font-bold mb-8 text-center text-shadow-neon-cyan">VIBE</Text>
      
      <View className="mb-4">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-cyan"
          placeholder="Email"
          placeholderTextColor="#666"
          onChangeText={(text) => setEmail(text)}
          value={email}
          autoCapitalize="none"
        />
      </View>
      
      <View className="mb-8">
        <TextInput
          className="bg-zinc-900 text-vibe-white p-4 rounded-lg border border-vibe-cyan"
          placeholder="Password"
          placeholderTextColor="#666"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity 
        className="bg-vibe-cyan p-4 rounded-lg shadow-lg shadow-vibe-cyan/50"
        onPress={signInWithEmail}
        disabled={loading}
      >
        <Text className="text-vibe-black text-center font-bold text-lg">
          {loading ? 'Loading...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-gray-400">Don't have an account? </Text>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity>
            <Text className="text-vibe-magenta font-bold">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
