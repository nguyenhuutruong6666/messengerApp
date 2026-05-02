import React, { useState, useEffect, useCallback, useRef } from 'react';
import UserAvatar from '../components/UserAvatar';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import { getFriends } from '../services/friendService';
import { getChatId } from '../services/chatService';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff < oneDay && now.getDate() === date.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
};

const SkeletonItem = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.conversationItem, { opacity }]}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.contentContainer}>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonMessage} />
            </View>
        </Animated.View>
    );
};

const MessagesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const unsubscribesRef = useRef([]);
    const loadedRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            unsubscribesRef.current.forEach(u => u());
            unsubscribesRef.current = [];

            const load = async () => {
                try {

                    if (!loadedRef.current) setLoading(true);

                    const friendIds = await getFriends(user.uid);
                    if (cancelled) return;

                    if (friendIds.length === 0) {
                        setConversations([]);
                        setLoading(false);
                        loadedRef.current = true;
                        return;
                    }

                    const friendsData = await Promise.all(
                        friendIds.map(id => getUserById(id))
                    );
                    if (cancelled) return;

                    const validFriends = friendsData.filter(Boolean);

                    setConversations(prev => {
                        const existing = {};
                        prev.forEach(c => { existing[c.id] = c; });
                        return validFriends.map(friend => ({
                            id: friend.id,
                            friendInfo: friend,
                            lastMessage: existing[friend.id]?.lastMessage || 'Chưa có tin nhắn',
                            updatedAt: existing[friend.id]?.updatedAt || null,
                            lastSenderId: existing[friend.id]?.lastSenderId || null,
                            isRead: existing[friend.id]?.isRead ?? true,
                        })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    });
                    setLoading(false);
                    loadedRef.current = true;

                    const unsubs = validFriends.map(friend => {
                        const chatId = getChatId(user.uid, friend.id);
                        return onValue(ref(db, `chats/${chatId}`), (snap) => {
                            if (cancelled) return;
                            const data = snap.exists() ? snap.val() : null;
                            setConversations(prev =>
                                prev.map(c =>
                                    c.id === friend.id
                                        ? {
                                            ...c,
                                            lastMessage: data?.lastMessage || 'Chưa có tin nhắn',
                                            lastSenderId: data?.lastSenderId || null,
                                            isRead: data?.isRead ?? true,
                                            updatedAt: data?.updatedAt || null,
                                        }
                                        : c
                                ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                            );
                        });
                    });

                    unsubscribesRef.current = unsubs;
                } catch (err) {
                    if (!cancelled) {
                        console.error('Error loading conversations:', err);
                        setLoading(false);
                        loadedRef.current = true;
                    }
                }
            };

            load();

            return () => {
                cancelled = true;
                unsubscribesRef.current.forEach(u => u());
                unsubscribesRef.current = [];
            };
        }, [user.uid])
    );

    const renderItem = ({ item }) => {
        const isUnread = item.lastSenderId && item.lastSenderId !== user.uid && !item.isRead;

        return (
            <TouchableOpacity
                style={[styles.conversationItem, isUnread && styles.conversationItemUnread]}
                onPress={() => navigation.navigate('ChatDetail', { friend: item.friendInfo })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <UserAvatar uri={item.friendInfo?.avatar} size={60} style={styles.avatar} />
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.topRow}>
                        <Text style={[styles.name, isUnread && styles.unreadName]}>
                            {item.friendInfo?.fullName}
                        </Text>
                        <Text style={[styles.time, isUnread && styles.unreadTime]}>
                            {formatTime(item.updatedAt)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                            style={[styles.message, isUnread && styles.unreadMessage]}
                            numberOfLines={1}
                        >
                            {item.lastSenderId === user.uid ? 'Bạn: ' : ''}
                            {item.lastMessage}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.headerTitle}>Đoạn chat</Text>
            {loading ? (
                <>
                    <SkeletonItem />
                    <SkeletonItem />
                    <SkeletonItem />
                    <SkeletonItem />
                </>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào.</Text>
                            <Text style={styles.emptySubText}>Hãy tìm bạn bè để bắt đầu!</Text>
                        </View>
                    }
                />
            )}

            {/* AI Chat FAB Button */}
            <TouchableOpacity
                style={styles.aiFab}
                onPress={() => navigation.navigate('AIChat')}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={['#6d28d9', '#7c3aed', '#a78bfa']}
                    style={styles.aiFabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="sparkles" size={26} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingTop: 10,
    },
    aiFab: {
        position: 'absolute',
        bottom: 110,
        right: 20,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    aiFabGradient: {
        width: 58,
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: '#FFFFFF',
        marginLeft: 18,
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    listContent: {
        paddingBottom: 110,
        paddingHorizontal: 8,
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        marginBottom: 2,
        borderRadius: 16,
        backgroundColor: 'transparent',
    },
    conversationItemUnread: {
        backgroundColor: '#1E1E1E',
    },
    avatarContainer: {
        marginRight: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2A2A2A',
    },
    skeletonAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 14,
        backgroundColor: '#1E1E1E',
    },
    skeletonName: {
        width: 140,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1E1E1E',
        marginBottom: 10,
    },
    skeletonMessage: {
        width: 200,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#1A1A1A',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
        color: '#E4E6EB',
    },
    time: {
        fontSize: 13,
        color: '#A0A3A8',
    },
    message: {
        fontSize: 15,
        color: '#A0A3A8',
        flex: 1,
    },
    unreadName: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    unreadMessage: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    unreadTime: {
        color: '#0084FF',
        fontWeight: '600',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
        backgroundColor: '#0084FF',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    emptySubText: {
        fontSize: 15,
        color: '#A0A3A8',
        marginTop: 8,
    },
});

export default MessagesScreen;
