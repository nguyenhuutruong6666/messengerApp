import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest, getMyAcceptedRequests } from '../services/friendService';
import { getUserById } from '../services/userService';
import { useFocusEffect } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';

const NotificationsScreen = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // 1. Get Pending Requests (Someone sent to me)
            const rawRequests = await getPendingRequests(user.uid);

            // 2. Get Accepted Requests (I sent, they accepted)
            const acceptedRequests = await getMyAcceptedRequests(user.uid);

            // 3. Process Pending Items
            const enrichedPending = await Promise.all(
                rawRequests.map(async (req) => {
                    const sender = await getUserById(req.fromUserId);
                    return { ...req, sender, type: 'friend_request' };
                })
            );

            // 4. Process Accepted Items
            const enrichedAccepted = await Promise.all(
                acceptedRequests.map(async (req) => {
                    const acceptor = await getUserById(req.toUserId);
                    return { ...req, sender: acceptor, type: 'friend_accepted' };
                })
            );

            // 5. Merge and Sort by Date (newest first)
            const allItems = [...enrichedPending, ...enrichedAccepted].sort((a, b) => {
                // Handle missing timestamps gracefully
                const timeA = (a.updatedAt || a.createdAt)?.seconds || 0;
                const timeB = (b.updatedAt || b.createdAt)?.seconds || 0;
                return timeB - timeA;
            });

            setNotifications(allItems);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId) => {
        try {
            await acceptFriendRequest(requestId);
            Alert.alert("Thành công", "Đã chấp nhận lời mời!");
            fetchNotifications(); // Refresh list
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectFriendRequest(requestId);
            fetchNotifications(); // Refresh list
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const renderItem = ({ item }) => {
        if (item.type === 'friend_request') {
            return (
                <View style={styles.requestItem}>
                    <UserAvatar uri={item.sender?.avatar} size={60} style={styles.avatar} />
                    <View style={styles.info}>
                        <Text style={styles.text}>
                            <Text style={styles.name}>{item.sender?.fullName}</Text> đã gửi lời mời kết bạn.
                        </Text>
                        <Text style={styles.date}>
                            {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : ''}
                        </Text>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                                <Text style={styles.btnText}>Đồng ý</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                                <Text style={styles.btnText}>Từ chối</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        } else if (item.type === 'friend_accepted') {
            return (
                <View style={styles.requestItem}>
                    <UserAvatar uri={item.sender?.avatar} size={60} style={styles.avatar} />
                    <View style={styles.info}>
                        <Text style={styles.text}>
                            <Text style={styles.name}>{item.sender?.fullName}</Text> đã chấp nhận lời mời kết bạn của bạn.
                        </Text>
                        <Text style={styles.date}>
                            {(item.updatedAt?.seconds)
                                ? new Date(item.updatedAt.seconds * 1000).toLocaleString()
                                : ''}
                        </Text>
                    </View>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Thông Báo</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0084ff" />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text style={styles.empty}>Không có thông báo mới.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#18191a',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#e4e6eb',
    },
    requestItem: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#242526',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3a3b3c',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 10,
    },
    info: {
        flex: 1,
    },
    text: {
        fontSize: 16,
        marginBottom: 5,
        color: '#e4e6eb',
    },
    name: {
        fontWeight: 'bold',
        color: '#fff',
    },
    date: {
        color: '#b0b3b8',
        fontSize: 12,
        marginBottom: 10,
    },
    actions: {
        flexDirection: 'row',
    },
    acceptBtn: {
        backgroundColor: '#0084ff',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginRight: 10,
    },
    rejectBtn: {
        backgroundColor: '#3a3b3c',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#b0b3b8',
        fontSize: 16,
    }
});

export default NotificationsScreen;
