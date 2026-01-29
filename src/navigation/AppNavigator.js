import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen'; // Will implement later
import FriendsScreen from '../screens/FriendsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

import { Ionicons } from '@expo/vector-icons';

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#18191a' },
            headerTintColor: '#fff',
            tabBarStyle: { backgroundColor: '#18191a', borderTopColor: '#3a3b3c' },
            tabBarActiveTintColor: '#0084ff',
            tabBarInactiveTintColor: '#b0b3b8',
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Messages') {
                    iconName = focused ? 'chatbubble' : 'chatbubble-outline';
                } else if (route.name === 'Friends') {
                    iconName = focused ? 'people' : 'people-outline';
                } else if (route.name === 'Notifications') {
                    iconName = focused ? 'notifications' : 'notifications-outline';
                } else if (route.name === 'Profile') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
        })}
    >
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Tin nhắn' }} />
        <Tab.Screen name="Friends" component={FriendsScreen} options={{ title: 'Kết bạn' }} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
);

const MainNavigator = () => (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#18191a' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Đoạn chat' }} />
    </Stack.Navigator>
);

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0084ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}
