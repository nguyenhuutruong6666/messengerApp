import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { searchUserByPhone, getUserById } from '../services/userService';
import { sendFriendRequest, getFriends, checkFriendRelationship } from '../services/friendService';
import UserAvatar from '../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

const FriendsScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [searchPhone, setSearchPhone] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [relationshipData, setRelationshipData] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [friends, setFriends] = useState([]);
    const [loadingFriends, setLoadingFriends] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchFriends();
            if (foundUser) {
                checkRelationship(foundUser.id);
            }
        }, [foundUser])
    );

    const fetchFriends = async () => {
        setLoadingFriends(true);
        try {
            const friendIds = await getFriends(user.uid);
            const friendsData = await Promise.all(friendIds.map(id => getUserById(id)));
            setFriends(friendsData);
        } catch (error) {
            console.error("Error fetching friends:", error);
        } finally {
            setLoadingFriends(false);
        }
    };

    const checkRelationship = async (targetUserId) => {
        const rel = await checkFriendRelationship(user.uid, targetUserId);
        setRelationshipData(rel);
    };

    const handleSearch = async () => {
        if (!searchPhone) return;
        setSearchLoading(true);
        setFoundUser(null);
        setRelationshipData(null);

        try {
            if (searchPhone === user.email.replace('@messenger.app', '')) {
                Alert.alert("Thông tin", "Đây là số của bạn mà.");
                return;
            }

            const result = await searchUserByPhone(searchPhone);

            if (result) {
                if (result.id === user.uid) {
                    Alert.alert("Thông tin", "Đây là số của bạn mà.");
                } else {
                    setFoundUser(result);
                    await checkRelationship(result.id);
                }
            } else {
                Alert.alert("Không tìm thấy", "Không tìm thấy người dùng với số này.");
            }
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSendRequest = async () => {
        if (!foundUser) return;
        try {
            await sendFriendRequest(user.uid, foundUser.id);
            Alert.alert("Thành công", "Đã gửi lời mời kết bạn!");
            await checkRelationship(foundUser.id);
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    let actionElement = null;

    if (foundUser) {
        if (!relationshipData) {
            actionElement = (
                <TouchableOpacity style={styles.addButton} onPress={handleSendRequest}>
                    <Text style={styles.addButtonText}>Kết bạn</Text>
                </TouchableOpacity>
            );
        } else {
            const { status, fromUserId } = relationshipData;

            if (status === 'accepted') {
                actionElement = (
                    <View style={styles.alreadyFriendBadge}>
                        <Text style={styles.alreadyFriendText}>Đã kết bạn</Text>
                    </View>
                );
            } else if (status === 'pending') {
                if (fromUserId === user.uid) {
                    actionElement = (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>Đã gửi lời mời</Text>
                        </View>
                    );
                } else {
                    actionElement = (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>Họ đã gửi lời mời</Text>
                        </View>
                    );
                }
            } else if (status === 'rejected') {
                actionElement = (
                    <TouchableOpacity style={styles.addButton} onPress={handleSendRequest}>
                        <Text style={styles.addButtonText}>Kết bạn</Text>
                    </TouchableOpacity>
                );
            }
        }
    }

    const renderFriendItem = ({ item }) => (
        <TouchableOpacity
            style={styles.friendItem}
            onPress={() => navigation.navigate('ChatDetail', { friend: item })}
        >
            <UserAvatar uri={item.avatar} size={50} style={{ marginRight: 15 }} />
            <View>
                <Text style={styles.friendName}>{item.fullName}</Text>
                <Text style={styles.friendPhone}>{item.phone}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Thêm bạn bè</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={30} color="#e4e6eb" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm bạn bằng SĐT..."
                        placeholderTextColor="#aaa"
                        value={searchPhone}
                        onChangeText={setSearchPhone}
                        keyboardType="phone-pad"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searchLoading}>
                        {searchLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchButtonText}>Tìm</Text>}
                    </TouchableOpacity>
                </View>

                {foundUser && (
                    <View style={styles.foundUserContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <UserAvatar uri={foundUser.avatar} size={50} style={{ marginRight: 10 }} />
                            <View>
                                <Text style={styles.foundUserText}>{foundUser.fullName}</Text>
                                <Text style={{ color: '#aaa', fontSize: 12 }}>Tìm thấy</Text>
                            </View>
                        </View>
                        {actionElement}
                    </View>
                )}

                <Text style={[styles.title, { marginTop: 30, marginBottom: 15, fontSize: 18 }]}>Danh sách bạn bè ({friends.length})</Text>

                {loadingFriends ? (
                    <ActivityIndicator color="#0084ff" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={item => item.id}
                        renderItem={renderFriendItem}
                        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bạn bè nào.</Text>}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#18191a',
        padding: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#e4e6eb',
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#3a3b3c',
        borderRadius: 8,
        padding: 10,
        marginRight: 10,
        backgroundColor: '#242526',
        color: '#e4e6eb',
    },
    searchButton: {
        backgroundColor: '#0084ff',
        padding: 10,
        borderRadius: 8,
        justifyContent: 'center',
        minWidth: 60,
        alignItems: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    foundUserContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#242526',
        borderWidth: 1,
        borderColor: '#3a3b3c',
        borderRadius: 8,
        marginTop: 10,
    },
    foundUserText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#e4e6eb',
    },
    addButton: {
        backgroundColor: '#00c853',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    alreadyFriendBadge: {
        backgroundColor: '#3a3b3c',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#0084ff',
    },
    alreadyFriendText: {
        color: '#0084ff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#242526',
        marginBottom: 8,
        borderRadius: 10,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#e4e6eb',
    },
    friendPhone: {
        fontSize: 13,
        color: '#b0b3b8',
        marginTop: 2,
    },
    emptyText: {
        color: '#b0b3b8',
        textAlign: 'center',
        marginTop: 20,
    },
    pendingBadge: {
        backgroundColor: '#3a3b3c',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#b0b3b8',
    },
    pendingText: {
        color: '#e4e6eb',
        fontWeight: 'bold',
        fontSize: 12,
    }
});

export default FriendsScreen;
