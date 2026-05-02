import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { searchUserByPhone, getUserById } from '../services/userService';
import { sendFriendRequest, getFriends, checkFriendRelationship } from '../services/friendService';
import UserAvatar from '../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

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
                    <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.addButtonText}>Kết bạn</Text>
                </TouchableOpacity>
            );
        } else {
            const { status, fromUserId } = relationshipData;

            if (status === 'accepted') {
                actionElement = (
                    <View style={styles.alreadyFriendBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#0084ff" style={{ marginRight: 4 }} />
                        <Text style={styles.alreadyFriendText}>Bạn bè</Text>
                    </View>
                );
            } else if (status === 'pending') {
                if (fromUserId === user.uid) {
                    actionElement = (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={16} color="#e4e6eb" style={{ marginRight: 4 }} />
                            <Text style={styles.pendingText}>Đã gửi lời mời</Text>
                        </View>
                    );
                } else {
                    actionElement = (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="mail-unread-outline" size={16} color="#e4e6eb" style={{ marginRight: 4 }} />
                            <Text style={styles.pendingText}>Họ đã gửi lời mời</Text>
                        </View>
                    );
                }
            } else if (status === 'rejected') {
                actionElement = (
                    <TouchableOpacity style={styles.addButton} onPress={handleSendRequest}>
                        <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.addButtonText}>Kết bạn</Text>
                    </TouchableOpacity>
                );
            }
        }
    }

    const renderFriendItem = ({ item }) => (
        <TouchableOpacity
            style={styles.friendItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatDetail', { friend: item })}
        >
            <UserAvatar uri={item.avatar} size={54} style={{ marginRight: 15 }} />
            <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.fullName}</Text>
                <Text style={styles.friendPhone}>{item.phone}</Text>
            </View>
            <TouchableOpacity style={styles.chatIconBtn} onPress={() => navigation.navigate('ChatDetail', { friend: item })}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#0084ff" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Bạn bè</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                        <Ionicons name="close" size={26} color="#e4e6eb" />
                    </TouchableOpacity>
                </View>


                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#8e8e93" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm bạn qua số điện thoại..."
                            placeholderTextColor="#8e8e93"
                            value={searchPhone}
                            onChangeText={setSearchPhone}
                            keyboardType="phone-pad"
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        {searchPhone.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchPhone('')} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={18} color="#8e8e93" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searchLoading || !searchPhone}>
                        {searchLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchButtonText}>Tìm</Text>}
                    </TouchableOpacity>
                </View>


                {foundUser && (
                    <View style={styles.foundUserContainer}>
                        <View style={styles.foundUserInfo}>
                            <UserAvatar uri={foundUser.avatar} size={56} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={styles.foundUserText}>{foundUser.fullName}</Text>
                                <Text style={styles.foundUserSub}>Tìm thấy từ số điện thoại</Text>
                            </View>
                        </View>
                        {actionElement}
                    </View>
                )}


                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Tất cả bạn bè</Text>
                    <View style={styles.badgeCount}>
                        <Text style={styles.badgeText}>{friends.length}</Text>
                    </View>
                </View>

                {loadingFriends ? (
                    <ActivityIndicator color="#0084ff" style={{ marginTop: 30 }} size="large" />
                ) : (
                    <FlatList
                        data={friends}
                        keyExtractor={item => item.id}
                        renderItem={renderFriendItem}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people" size={60} color="#3a3b3c" />
                                <Text style={styles.emptyText}>Chưa có bạn bè nào.</Text>
                                <Text style={styles.emptySubText}>Hãy tìm kiếm và kết nối với mọi người nhé!</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
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
    searchSection: {
        flexDirection: 'row',
        marginBottom: 25,
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#242526',
        borderRadius: 20, 
        height: 48,
        paddingHorizontal: 15,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#3a3b3c',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#e4e6eb',
        fontSize: 16,
        height: '100%',
    },
    clearBtn: {
        padding: 4,
    },
    searchButton: {
        backgroundColor: '#0084ff',
        height: 48,
        paddingHorizontal: 18,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    foundUserContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#2c2c2e',
        borderRadius: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    foundUserInfo: {
        flexDirection: 'row', alignItems: 'center', flex: 1,
    },
    foundUserText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    foundUserSub: {
        color: '#8e8e93', fontSize: 13,
    },
    addButton: {
        backgroundColor: '#0084ff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    alreadyFriendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 132, 255, 0.15)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    alreadyFriendText: {
        color: '#0084ff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a3b3c',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    pendingText: {
        color: '#e4e6eb',
        fontWeight: 'bold',
        fontSize: 12,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    listTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e4e6eb',
        marginRight: 10,
    },
    badgeCount: {
        backgroundColor: '#242526',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#0084ff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#1e1e1e',
        marginBottom: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#2c2c2e',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    friendPhone: {
        fontSize: 14,
        color: '#8e8e93',
    },
    chatIconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        color: '#e4e6eb',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubText: {
        color: '#8e8e93',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});

export default FriendsScreen;
