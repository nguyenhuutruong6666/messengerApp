import React, { useState, useEffect, useCallback, useRef } from 'react';
import UserAvatar from '../components/UserAvatar';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import { getFriends } from '../services/friendService';
import { getChatId } from '../services/chatService';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';

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
                style={styles.conversationItem}
                onPress={() => navigation.navigate('ChatDetail', { friend: item.friendInfo })}
            >
                <UserAvatar uri={item.friendInfo?.avatar} size={60} style={styles.avatar} />
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
        <View style={styles.container}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#18191a',
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#e4e6eb',
        marginLeft: 15,
        marginBottom: 15,
    },
    listContent: {
        paddingBottom: 20,
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 5,
        borderRadius: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
        backgroundColor: '#3a3b3c',
    },
    skeletonAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
        backgroundColor: '#3a3b3c',
    },
    skeletonName: {
        width: 140,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3a3b3c',
        marginBottom: 8,
    },
    skeletonMessage: {
        width: 200,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#2d2e2f',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
        color: '#e4e6eb',
    },
    time: {
        fontSize: 12,
        color: '#b0b3b8',
    },
    message: {
        fontSize: 14,
        color: '#b0b3b8',
        flex: 1,
    },
    unreadName: {
        color: '#fff',
        fontWeight: 'bold',
    },
    unreadMessage: {
        color: '#fff',
        fontWeight: 'bold',
    },
    unreadTime: {
        color: '#0084ff',
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#0084ff',
        marginLeft: 5,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#e4e6eb',
    },
    emptySubText: {
        color: '#b0b3b8',
        marginTop: 5,
    },
});

export default MessagesScreen;
