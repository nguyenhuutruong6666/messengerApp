import React, { useState, useEffect, useCallback } from 'react';
import UserAvatar from '../components/UserAvatar';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import { getFriends } from '../services/friendService';
import { getChatId } from '../services/chatService'; // Need to export this or recreate it
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';

const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && now.getDate() === date.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString();
    }
};

const MessagesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchConversations = async () => {
                const friendIds = await getFriends(user.uid);
                const friendsData = await Promise.all(friendIds.map(id => getUserById(id)));
                const unsubscribes = [];
                const chatsMap = {};
                const initialConvos = friendsData.map(friend => ({
                    id: friend.id,
                    friendInfo: friend,
                    lastMessage: '',
                    updatedAt: null
                }));

                let currentConvos = [...initialConvos];
                setConversations(currentConvos);
                setLoading(false);

                friendsData.forEach((friend) => {
                    const chatId = user.uid < friend.id ? `${user.uid}_${friend.id}` : `${friend.id}_${user.uid}`;
                    const unsub = onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
                        const data = docSnap.exists() ? docSnap.data() : null;

                        setConversations(prevConvos => {
                            const newConvos = prevConvos.map(c => {
                                if (c.id === friend.id) {
                                    return {
                                        ...c,
                                        lastMessage: data?.lastMessage || 'Chưa có tin nhắn',
                                        lastSenderId: data?.lastSenderId,
                                        isRead: data?.isRead,
                                        updatedAt: data?.updatedAt || null
                                    };
                                }
                                return c;
                            });
                            return newConvos.sort((a, b) => {
                                const timeA = a.updatedAt?.toMillis() || 0;
                                const timeB = b.updatedAt?.toMillis() || 0;
                                return timeB - timeA;
                            });
                        });
                    });
                    unsubscribes.push(unsub);
                });

                return () => unsubscribes.forEach(u => u());
            };

            let cleanup;
            fetchConversations().then(fn => cleanup = fn);
            return () => { if (cleanup) cleanup(); };
        }, [])
    );

    const renderItem = ({ item }) => {
        const isUnread = item.lastSenderId && item.lastSenderId !== user.uid && !item.isRead;

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => navigation.navigate('ChatDetail', { friend: item.friendInfo })}
            >
                <UserAvatar uri={item.friendInfo.avatar} size={60} style={styles.avatar} />
                <View style={styles.contentContainer}>
                    <View style={styles.topRow}>
                        <Text style={[styles.name, isUnread && styles.unreadName]}>{item.friendInfo.fullName}</Text>
                        <Text style={[styles.time, isUnread && styles.unreadTime]}>{formatTime(item.updatedAt)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.message, isUnread && styles.unreadMessage]} numberOfLines={1}>
                            {item.lastSenderId === user.uid ? 'Bạn: ' : ''}{item.lastMessage}
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
                <ActivityIndicator size="large" color="#0084ff" style={{ marginTop: 50 }} />
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
