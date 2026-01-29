import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getPendingRequests, acceptFriendRequest, rejectFriendRequest } from '../services/friendService';
import { getUserById } from '../services/userService';
import { useFocusEffect } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';

const NotificationsScreen = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchRequests();
        }, [])
    );

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const rawRequests = await getPendingRequests(user.uid);

            // Enrich requests with sender details
            const enrichedRequests = await Promise.all(
                rawRequests.map(async (req) => {
                    const sender = await getUserById(req.fromUserId);
                    return { ...req, sender };
                })
            );
            setRequests(enrichedRequests);
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
            fetchRequests(); // Refresh list
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await rejectFriendRequest(requestId);
            fetchRequests(); // Refresh list
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.requestItem}>
            <UserAvatar uri={item.sender?.avatar} size={60} style={styles.avatar} />
            <View style={styles.info}>
                <Text style={styles.text}>
                    <Text style={styles.name}>{item.sender?.fullName}</Text> đã gửi lời mời kết bạn.
                </Text>
                <Text style={styles.date}>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</Text>

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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Thông Báo</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0084ff" />
            ) : (
                <FlatList
                    data={requests}
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
