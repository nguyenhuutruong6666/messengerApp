import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { searchUserByPhone } from '../services/userService';
import { sendFriendRequest } from '../services/friendService';
import UserAvatar from '../components/UserAvatar';

const FriendsScreen = () => {
    const { user } = useAuth();
    const [searchPhone, setSearchPhone] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchPhone) return;
        setSearchLoading(true);
        setFoundUser(null);
        try {
            if (searchPhone === user.email.replace('@messenger.app', '')) {
                Alert.alert("Thông tin", "Đây là số của bạn mà.");
                return;
            }
            const result = await searchUserByPhone(searchPhone);
            if (result) {
                setFoundUser(result);
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
            setFoundUser(null);
            setSearchPhone('');
        } catch (error) {
            Alert.alert("Lỗi", error.message);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <Text style={styles.title}>Thêm bạn bè</Text>

                {/* Search Section */}
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
                        <Text style={styles.searchButtonText}>Tìm</Text>
                    </TouchableOpacity>
                </View>

                {/* Found User Result */}
                {foundUser && (
                    <View style={styles.foundUserContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <UserAvatar uri={foundUser.avatar} size={50} style={{ marginRight: 10 }} />
                            <View>
                                <Text style={styles.foundUserText}>{foundUser.fullName}</Text>
                                <Text style={{ color: '#aaa', fontSize: 12 }}>Tìm thấy</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={handleSendRequest}>
                            <Text style={styles.addButtonText}>Kết bạn</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {searchLoading && <ActivityIndicator style={{ marginTop: 20 }} color="#0084ff" />}
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#18191a',
        padding: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e4e6eb',
        marginBottom: 20,
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
        marginTop: 20,
    },
    foundUserText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#e4e6eb',
    },
    addButton: {
        backgroundColor: '#00c853',
        padding: 8,
        borderRadius: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default FriendsScreen;
