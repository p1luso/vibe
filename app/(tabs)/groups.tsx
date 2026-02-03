import { View, Text, FlatList, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

type Group = {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    admin_id: string;
};

export default function GroupsScreen() {
    const { user } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Create Group State
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [newGroupImage, setNewGroupImage] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        if (user) fetchGroups();
    }, [user]);

    const fetchGroups = async () => {
        if (!user) return;
        setRefreshing(true);
        
        // Fetch groups where I am a member
        const { data: memberData, error } = await supabase
            .from('group_members')
            .select('group_id, groups(*)')
            .eq('user_id', user.id);

        if (error) {
            console.error(error);
            Alert.alert("Error fetching groups");
        } else {
            // Flatten the structure
            const myGroups = memberData.map((item: any) => item.groups).filter(Boolean);
            setGroups(myGroups);
        }
        setRefreshing(false);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert("Please enter a group name");
            return;
        }
        setLoading(true);

        try {
            // 1. Upload Image if exists
            let avatarUrl = null;
            if (newGroupImage) {
                const fileName = `groups/${Date.now()}.jpg`;
                const response = await fetch(newGroupImage);
                const blob = await response.blob();
                const arrayBuffer = await new Response(blob).arrayBuffer();
                
                await supabase.storage.from('avatars').upload(fileName, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });
                
                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                avatarUrl = data.publicUrl;
            }

            // 2. Insert Group
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    description: newGroupDesc,
                    avatar_url: avatarUrl,
                    admin_id: user?.id
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // 3. Add Admin as Member
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: user?.id,
                    status: 'accepted'
                });

            if (memberError) throw memberError;

            Alert.alert("Group Created!");
            setIsCreating(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setNewGroupImage(null);
            fetchGroups();

        } catch (e: any) {
            Alert.alert("Error creating group", e.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewGroupImage(result.assets[0].uri);
        }
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <TouchableOpacity 
            className="flex-row items-center bg-zinc-900 p-4 rounded-xl mb-3 border border-zinc-800"
            onPress={() => Alert.alert("Group Details", "Feature coming in next step: Invite friends & Chat")}
        >
            <Image 
                source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }} 
                className="w-14 h-14 rounded-full bg-zinc-800"
            />
            <View className="ml-4 flex-1">
                <Text className="text-white font-bold text-lg">{item.name}</Text>
                <Text className="text-gray-400 text-sm" numberOfLines={1}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-vibe-black p-4 pt-12">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white text-3xl font-bold">My Groups</Text>
                <TouchableOpacity onPress={() => setIsCreating(true)}>
                    <Ionicons name="add-circle" size={40} color="#00FFFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={groups}
                keyExtractor={item => item.id}
                renderItem={renderGroupItem}
                refreshing={refreshing}
                onRefresh={fetchGroups}
                ListEmptyComponent={
                    <View className="items-center mt-20">
                        <Ionicons name="people-outline" size={64} color="#333" />
                        <Text className="text-gray-500 mt-4 text-center">No groups yet.{"\n"}Create one and invite your squad!</Text>
                    </View>
                }
            />

            {/* Create Group Modal */}
            <Modal visible={isCreating} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-vibe-black p-6">
                    <View className="flex-row justify-between items-center mb-8 mt-4">
                        <Text className="text-white text-xl font-bold">New Squad</Text>
                        <TouchableOpacity onPress={() => setIsCreating(false)}>
                            <Text className="text-vibe-cyan font-bold">Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="items-center mb-8">
                        <TouchableOpacity onPress={pickImage} className="w-24 h-24 bg-zinc-900 rounded-full justify-center items-center border border-dashed border-zinc-600 overflow-hidden">
                            {newGroupImage ? (
                                <Image source={{ uri: newGroupImage }} className="w-full h-full" />
                            ) : (
                                <Ionicons name="camera" size={32} color="#666" />
                            )}
                        </TouchableOpacity>
                        <Text className="text-gray-500 text-xs mt-2">Group Icon</Text>
                    </View>

                    <Text className="text-gray-400 mb-2">Group Name</Text>
                    <TextInput 
                        className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-6"
                        placeholder="e.g. The Boys, Rave Crew"
                        placeholderTextColor="#555"
                        value={newGroupName}
                        onChangeText={setNewGroupName}
                    />

                    <Text className="text-gray-400 mb-2">Description</Text>
                    <TextInput 
                        className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 mb-8 min-h-[100px]"
                        placeholder="What's this group about?"
                        placeholderTextColor="#555"
                        multiline
                        value={newGroupDesc}
                        onChangeText={setNewGroupDesc}
                    />

                    <TouchableOpacity 
                        className="bg-vibe-magenta py-4 rounded-xl items-center shadow-lg shadow-vibe-magenta/30"
                        onPress={handleCreateGroup}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Create Group</Text>}
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}
