import React, { useEffect, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NewsScreen from '../screens/NewsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

const SplashScreen = () => {
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {

        Animated.loop(
            Animated.sequence([
                Animated.timing(logoScale, { toValue: 1.05, duration: 900, useNativeDriver: true }),
                Animated.timing(logoScale, { toValue: 0.95, duration: 900, useNativeDriver: true }),
            ])
        ).start();

        const animateDot = (dot, delay) => Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
                Animated.delay(600),
            ])
        ).start();
        animateDot(dot1, 0);
        animateDot(dot2, 200);
        animateDot(dot3, 400);
    }, []);

    return (
        <View style={splash.container}>
            <Animated.View style={[splash.logoBox, { transform: [{ scale: logoScale }] }]}>
                <Ionicons name="chatbubble-ellipses" size={64} color="#0084ff" />
            </Animated.View>
            <Text style={splash.title}>Messta</Text>
            <Text style={splash.subtitle}>Kết nối mọi người</Text>
            <View style={splash.dotsRow}>
                <Animated.View style={[splash.dot, { opacity: dot1 }]} />
                <Animated.View style={[splash.dot, { opacity: dot2 }]} />
                <Animated.View style={[splash.dot, { opacity: dot3 }]} />
            </View>
        </View>
    );
};

const splash = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#18191a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBox: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(0,132,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(0,132,255,0.3)',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#e4e6eb',
        letterSpacing: 1,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#b0b3b8',
        marginBottom: 40,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0084ff',
    },
});

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            headerStyle: { backgroundColor: '#18191a' },
            headerTintColor: '#fff',
            tabBarStyle: { backgroundColor: '#18191a', borderTopColor: '#3a3b3c' },
            tabBarActiveTintColor: '#0084ff',
            tabBarInactiveTintColor: '#b0b3b8',
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'News') {
                    iconName = focused ? 'camera' : 'camera-outline';
                } else if (route.name === 'Messages') {
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
        <Tab.Screen name="News" component={NewsScreen} options={{ title: 'Tin tức' }} />
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Tin nhắn' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
);

const MainNavigator = () => {
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    useEffect(() => {
        const requestPermissions = async () => {
            try {
                const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
                if (mediaStatus.status !== 'granted' && mediaStatus.canAskAgain) {
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                }
                if (!cameraPermission?.granted && cameraPermission?.canAskAgain) {
                    await requestCameraPermission();
                }
            } catch (error) {
                console.log("Error requesting permissions:", error);
            }
        };

        requestPermissions();
    }, [cameraPermission]);

    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#18191a' }, headerTintColor: '#fff' }}>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: 'Đoạn chat' }} />
            <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer>
            {user ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
}
