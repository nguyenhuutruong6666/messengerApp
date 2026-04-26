import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { ref, update } from 'firebase/database';
import { db } from '../config/firebaseConfig';

const ProfileScreen = () => {
    const { user, userData, logout } = useAuth();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleChangeAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],   // crop vuông cho avatar
            quality: 0.85,
        });

        if (result.canceled) return;

        const uri = result.assets[0].uri;
        setUploadingAvatar(true);

        try {
            const avatarUrl = await uploadImageToCloudinary(uri, 'avatars');
            await update(ref(db, `users/${user.uid}`), { avatar: avatarUrl });
            // userData tự cập nhật qua onValue trong AuthContext
        } catch (error) {
            console.error('Avatar upload error:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện. Thử lại nhé.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    onPress: async () => {
                        try { await logout(); } catch (e) { console.error(e); }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    if (!userData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0084ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Avatar */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleChangeAvatar}
                    disabled={uploadingAvatar}
                    style={{ position: 'relative' }}
                    activeOpacity={0.8}
                >
                    <UserAvatar uri={userData.avatar} size={120} style={styles.avatarBorder} />

                    {/* Overlay loading khi đang upload */}
                    {uploadingAvatar && (
                        <View style={styles.avatarOverlay}>
                            <ActivityIndicator color="#fff" />
                        </View>
                    )}

                    {/* Camera icon */}
                    <View style={styles.cameraIconContainer}>
                        <Ionicons name="camera" size={18} color="#fff" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.name}>{userData.fullName}</Text>
                <Text style={styles.phone}>{userData.phone}</Text>
            </View>

            {/* Thông tin */}
            <View style={styles.infoSection}>
                <InfoRow icon="call-outline" label="Số điện thoại" value={userData.phone} />
                <InfoRow icon="calendar-outline" label="Ngày sinh" value={userData.birthday} />
                <InfoRow icon="person-outline" label="Giới tính" value={userData.gender} last />
            </View>

            {/* Đăng xuất */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color="#ff3b30" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
};

const InfoRow = ({ icon, label, value, last }) => (
    <View style={[styles.infoItem, last && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
        <View style={styles.infoLeft}>
            <Ionicons name={icon} size={18} color="#0084ff" style={{ marginRight: 10 }} />
            <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value || '—'}</Text>
    </View>
);

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#18191a',
    },
    container: {
        flex: 1, padding: 20, backgroundColor: '#18191a',
    },
    header: {
        alignItems: 'center', marginBottom: 30, marginTop: 20,
    },
    avatarBorder: {
        borderWidth: 3, borderColor: '#0084ff',
    },
    avatarOverlay: {
        position: 'absolute', top: 0, left: 0,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center',
    },
    cameraIconContainer: {
        position: 'absolute', bottom: 4, right: 4,
        backgroundColor: '#0084ff',
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#18191a',
    },
    name: {
        fontSize: 24, fontWeight: 'bold', color: '#e4e6eb', marginTop: 14,
    },
    phone: {
        fontSize: 14, color: '#b0b3b8', marginTop: 4,
    },
    infoSection: {
        backgroundColor: '#242526', padding: 16,
        borderRadius: 15, marginBottom: 30,
    },
    infoItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#3a3b3c', paddingBottom: 14,
    },
    infoLeft: { flexDirection: 'row', alignItems: 'center' },
    label: { color: '#b0b3b8', fontSize: 15 },
    value: { color: '#e4e6eb', fontSize: 15, fontWeight: '500' },
    logoutButton: {
        backgroundColor: '#242526', padding: 15, borderRadius: 12,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        borderWidth: 1, borderColor: '#3e4042',
    },
    logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
