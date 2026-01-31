import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import UserAvatar from '../components/UserAvatar';

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        try {
            const userData = await getUserById(user.uid);
            setProfile(userData);
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể tải thông tin cá nhân");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Đăng xuất",
            "Bạn có chắc chắn muốn đăng xuất không?",
            [
                {
                    text: "Hủy",
                    style: "cancel"
                },
                {
                    text: "Đăng xuất",
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error(error);
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0084ff" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.container}>
                <Text style={{ color: '#fff' }}>Không tìm thấy hồ sơ.</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ position: 'relative' }}>
                    <UserAvatar uri={profile.avatar} size={120} style={styles.avatarBorder} />
                    <View style={styles.cameraIconContainer}>
                        <Ionicons name="camera" size={20} color="#fff" />
                    </View>
                </View>
                <Text style={styles.name}>{profile.fullName}</Text>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Số điện thoại:</Text>
                    <Text style={styles.value}>{profile.phone}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Ngày sinh:</Text>
                    <Text style={styles.value}>{profile.birthday}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Text style={styles.label}>Giới tính:</Text>
                    <Text style={styles.value}>{profile.gender}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#18191a',
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#18191a',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    avatarBorder: {
        borderWidth: 3,
        borderColor: '#0084ff',
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 15,
        right: 0,
        backgroundColor: '#3a3b3c',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#18191a',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#e4e6eb',
    },
    infoSection: {
        backgroundColor: '#242526',
        padding: 20,
        borderRadius: 15,
        marginBottom: 30,
    },
    infoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#3a3b3c',
        paddingBottom: 10,
    },
    label: {
        color: '#b0b3b8',
        fontSize: 16,
    },
    value: {
        color: '#e4e6eb',
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: '#3a3b3c', // Less aggressive than red
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3e4042',
    },
    logoutText: {
        color: '#ff3b30', // Red text
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProfileScreen;
