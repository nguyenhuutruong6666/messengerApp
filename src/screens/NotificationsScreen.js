import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest, getMyAcceptedRequests } from '../services/friendService';
import { getUserById } from '../services/userService';
import { useFocusEffect } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';

const NotificationsScreen = ({ navigation }) => {
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
            const rawRequests = await getPendingRequests(user.uid);
            const acceptedRequests = await getMyAcceptedRequests(user.uid);
            const enrichedPending = await Promise.all(
                rawRequests.map(async (req) => {
                    const sender = await getUserById(req.fromUserId);
                    return { ...req, sender, type: 'friend_request' };
                })
            );
            const enrichedAccepted = await Promise.all(
                acceptedRequests.map(async (req) => {
                    const acceptor = await getUserById(req.toUserId);
                    return { ...req, sender: acceptor, type: 'friend_accepted' };
                })
            );
            const allItems = [...enrichedPending, ...enrichedAccepted].sort((a, b) => {
                const timeA = (a.updatedAt || a.createdAt) || 0;
                const timeB = (b.updatedAt || b.createdAt) || 0;
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
            fetchNotifications();
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectFriendRequest(requestId);
            fetchNotifications();
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const renderItem = ({ item }) => {
        if (item.type === 'friend_request') {
            return (
                <View style={styles.requestItem}>
                    <UserAvatar uri={item.sender?.avatar} size={64} style={styles.avatar} />
                    <View style={styles.info}>
                        <Text style={styles.text}>
                            <Text style={styles.name}>{item.sender?.fullName}</Text> đã gửi lời mời kết bạn.
                        </Text>
                        <Text style={styles.date}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                        </Text>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                                <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.acceptBtnText}>Đồng ý</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                                <Text style={styles.rejectBtnText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        } else if (item.type === 'friend_accepted') {
            return (
                <View style={styles.requestItem}>
                    <UserAvatar uri={item.sender?.avatar} size={64} style={styles.avatar} />
                    <View style={styles.info}>
                        <Text style={styles.text}>
                            <Text style={styles.name}>{item.sender?.fullName}</Text> đã chấp nhận lời mời kết bạn. Bạn có thể nhắn tin ngay bây giờ!
                        </Text>
                        <Text style={styles.date}>
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}
                        </Text>
                    </View>
                    <View style={styles.iconBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#0084ff" />
                    </View>
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Thông báo</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Ionicons name="close" size={26} color="#e4e6eb" />
                </TouchableOpacity>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#0084ff" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons name="notifications-off" size={50} color="#b0b3b8" />
                            </View>
                            <Text style={styles.emptyText}>Bạn chưa có thông báo nào</Text>
                            <Text style={styles.emptySub}>Khi có người gửi lời mời kết bạn, thông báo sẽ hiển thị tại đây.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 25,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#e4e6eb',
        letterSpacing: 0.5,
    },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#242526',
        justifyContent: 'center', alignItems: 'center',
    },
    requestItem: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#1e1e1e',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2c2c2e',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        marginRight: 14,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 6,
        color: '#e4e6eb',
    },
    name: {
        fontWeight: 'bold',
        color: '#ffffff',
        fontSize: 16,
    },
    date: {
        color: '#8e8e93',
        fontSize: 13,
        marginBottom: 12,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 4,
    },
    acceptBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#0084ff',
        paddingVertical: 10,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: '#3a3b3c',
        paddingVertical: 10,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    rejectBtnText: {
        color: '#e4e6eb',
        fontWeight: 'bold',
        fontSize: 15,
    },
    iconBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#242526',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        color: '#e4e6eb',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySub: {
        color: '#8e8e93',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    }
});

export default NotificationsScreen;
