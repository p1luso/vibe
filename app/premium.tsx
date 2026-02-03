import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function PremiumScreen() {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchPaymentSheetParams = async () => {
        // In a real app, fetch this from your Supabase Edge Function
        // const response = await fetch(`${supabaseUrl}/functions/v1/payment-sheet`, ...)
        // const { paymentIntent, ephemeralKey, customer } = await response.json();
        
        // MOCK for Demo
        return {
            paymentIntent: 'pi_mock_secret_123',
            ephemeralKey: 'ek_mock_123',
            customer: 'cus_mock_123',
        };
    };

    const initializePaymentSheet = async () => {
        setLoading(true);

        // 1. Fetch params (Mocked)
        // const { paymentIntent, ephemeralKey, customer } = await fetchPaymentSheetParams();

        // 2. Initialize
        // const { error } = await initPaymentSheet({
        //     merchantDisplayName: "Vibe App",
        //     customerId: customer,
        //     customerEphemeralKeySecret: ephemeralKey,
        //     paymentIntentClientSecret: paymentIntent,
        //     allowsDelayedPaymentMethods: true,
        //     defaultBillingDetails: {
        //         name: 'Vibe User',
        //     }
        // });

        setLoading(false);
        
        // if (error) {
        //     Alert.alert('Error loading payment', error.message);
        // } else {
            // Check
            openPaymentSheet();
        // }
    };

    const openPaymentSheet = async () => {
        // const { error } = await presentPaymentSheet();

        // if (error) {
        //     Alert.alert(`Error code: ${error.code}`, error.message);
        // } else {
            Alert.alert('Success', 'Your order is confirmed! (Mock)');
            router.back();
        // }
    };

    const handleSubscribe = () => {
        Alert.alert("Premium Feature", "Stripe integration requires a backend function. This is a UI demo.", [
            { text: "Simulate Success", onPress: () => Alert.alert("Success", "Welcome to Vibe Premium!") },
            { text: "Cancel", style: "cancel" }
        ]);
    };

    return (
        <View className="flex-1 bg-vibe-black">
            <View className="h-full w-full absolute">
                 <LinearGradient
                    colors={['#FF00FF', '#000000']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.4 }}
                    className="w-full h-full opacity-20"
                />
            </View>

            <View className="p-6 pt-12 flex-row justify-between items-center">
                <TouchableOpacity onPress={() => router.back()} className="bg-black/50 p-2 rounded-full">
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg tracking-widest uppercase">Vibe Premium</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-6">
                <View className="items-center mb-8 mt-4">
                    <View className="w-24 h-24 bg-gradient-to-tr from-vibe-magenta to-vibe-cyan rounded-full items-center justify-center mb-4 shadow-2xl shadow-vibe-magenta">
                         <Ionicons name="diamond" size={48} color="white" />
                    </View>
                    <Text className="text-white text-4xl font-bold mb-2">Unlock the Vibe</Text>
                    <Text className="text-gray-400 text-center text-lg">
                        Get the ultimate party experience with exclusive features.
                    </Text>
                </View>

                <View className="gap-4 mb-8">
                    <FeatureRow icon="infinite" title="Unlimited Chats" desc="Join as many squad chats as you want." />
                    <FeatureRow icon="eye" title="See Who Likes You" desc="Reveal who is vibing with you before the party." />
                    <FeatureRow icon="flash" title="Boost Your Events" desc="Get your parties featured on the map." />
                    <FeatureRow icon="ticket" title="Priority Access" desc="Skip the line at partner venues." />
                </View>

                <TouchableOpacity 
                    className="bg-vibe-magenta py-5 rounded-2xl items-center shadow-lg shadow-vibe-magenta/50 mb-4"
                    onPress={handleSubscribe}
                >
                    <Text className="text-white font-bold text-xl uppercase tracking-wider">Get Premium - $4.99/mo</Text>
                </TouchableOpacity>

                <Text className="text-gray-600 text-center text-xs">
                    Recurring billing. Cancel anytime. By subscribing you agree to our Terms of Service.
                </Text>
            </ScrollView>
        </View>
    );
}

function FeatureRow({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <View className="flex-row items-center bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
            <View className="w-12 h-12 bg-black rounded-full items-center justify-center mr-4 border border-zinc-700">
                <Ionicons name={icon} size={24} color="#00FFFF" />
            </View>
            <View className="flex-1">
                <Text className="text-white font-bold text-lg">{title}</Text>
                <Text className="text-gray-400 text-sm">{desc}</Text>
            </View>
        </View>
    );
}
