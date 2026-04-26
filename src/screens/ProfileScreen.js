import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { ref, update } from 'firebase/database';
import { db } from '../config/firebaseConfig';

const ProfileScreen = ({ navigation }) => {
    const { user, userData, logout } = useAuth();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editFullName, setEditFullName] = useState('');
    const [editBirthday, setEditBirthday] = useState('');
    const [editGender, setEditGender] = useState('');
    const [saving, setSaving] = useState(false);

    const openEditModal = () => {
        setEditFullName(userData.fullName || '');
        setEditBirthday(userData.birthday || '');
        setEditGender(userData.gender || 'Nam');
        setEditModalVisible(true);
    };

    const handleEditDateChange = (text) => {
        let cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length >= 2) {
            let day = parseInt(cleaned.slice(0, 2));
            if (day > 31) cleaned = '31' + cleaned.slice(2);
            if (day === 0 && cleaned.length === 2) cleaned = '01';
        }
        if (cleaned.length >= 4) {
            let month = parseInt(cleaned.slice(2, 4));
            if (month > 12) cleaned = cleaned.slice(0, 2) + '12' + cleaned.slice(4);
            if (month === 0 && cleaned.length === 4) cleaned = cleaned.slice(0, 2) + '01';
        }
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
            formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4, 8);
        }
        setEditBirthday(formatted);
    };

    const handleSaveProfile = () => {
        if (!editFullName.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập họ và tên.");
            return;
        }

        Alert.alert(
            "Xác nhận",
            "Bạn có chắc chắn muốn lưu các thay đổi này không?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Đồng ý",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await update(ref(db, `users/${user.uid}`), {
                                fullName: editFullName.trim(),
                                birthday: editBirthday.trim(),
                                gender: editGender.trim(),
                            });
                            setEditModalVisible(false);
                        } catch (error) {
                            console.error('Update profile error:', error);
                            Alert.alert("Lỗi", "Không thể cập nhật thông tin. Vui lòng thử lại.");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleChangeAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (result.canceled) return;

        const uri = result.assets[0].uri;
        setUploadingAvatar(true);

        try {
            const avatarUrl = await uploadImageToCloudinary(uri, 'avatars');
            await update(ref(db, `users/${user.uid}`), { avatar: avatarUrl });

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
        <SafeAreaView style={styles.container}>
            {/* Top Navigation Buttons */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.navigate('Friends')} style={styles.topNavBtn}>
                    <Ionicons name="people-outline" size={24} color="#e4e6eb" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.topNavBtn}>
                    <Ionicons name="notifications-outline" size={24} color="#e4e6eb" />
                </TouchableOpacity>
            </View>

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
            </View>

            {/* Thông tin */}
            <View style={styles.infoSection}>
                <InfoRow icon="call-outline" label="Số điện thoại" value={userData.phone} />
                <InfoRow icon="calendar-outline" label="Ngày sinh" value={userData.birthday} />
                <InfoRow icon="person-outline" label="Giới tính" value={userData.gender} last />
            </View>

            {/* Chỉnh sửa thông tin */}
            <TouchableOpacity onPress={openEditModal} style={styles.editButton}>
                <Ionicons name="pencil" size={20} color="#e4e6eb" style={{ marginRight: 8 }} />
                <Text style={styles.editText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>

            {/* Đăng xuất */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color="#ff3b30" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
            {/* Modal chỉnh sửa */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Chỉnh sửa</Text>
                            <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                                {saving ? <ActivityIndicator color="#0084ff" /> : <Text style={styles.saveText}>Lưu</Text>}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formContainer}>
                            <Text style={styles.inputLabel}>Họ và tên</Text>
                            <TextInput
                                style={styles.input}
                                value={editFullName}
                                onChangeText={setEditFullName}
                                placeholderTextColor="#aaa"
                            />

                            <Text style={styles.inputLabel}>Ngày sinh (DD/MM/YYYY)</Text>
                            <TextInput
                                style={styles.input}
                                value={editBirthday}
                                onChangeText={handleEditDateChange}
                                placeholderTextColor="#aaa"
                                keyboardType="numeric"
                                maxLength={10}
                            />

                            <Text style={styles.inputLabel}>Giới tính</Text>
                            <View style={styles.genderOptions}>
                                {['Nam', 'Nữ', 'Khác'].map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[styles.genderButton, editGender === g && styles.genderButtonSelected]}
                                        onPress={() => setEditGender(g)}
                                    >
                                        <Text style={[styles.genderText, editGender === g && styles.genderTextSelected]}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
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
    topNav: {
        flexDirection: 'row', justifyContent: 'space-between', width: '100%',
        paddingHorizontal: 5, marginTop: 5,
    },
    topNavBtn: {
        padding: 10, backgroundColor: '#242526', borderRadius: 22,
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
    editButton: {
        backgroundColor: '#3a3b3c', padding: 15, borderRadius: 12,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        marginBottom: 15,
    },
    editText: { color: '#e4e6eb', fontSize: 16, fontWeight: 'bold' },
    logoutButton: {
        backgroundColor: '#242526', padding: 15, borderRadius: 12,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        borderWidth: 1, borderColor: '#3e4042',
    },
    logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' },
    modalContainer: {
        flex: 1, backgroundColor: '#18191a',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 15, borderBottomWidth: 1, borderBottomColor: '#3a3b3c',
    },
    cancelText: { color: '#b0b3b8', fontSize: 16 },
    saveText: { color: '#0084ff', fontSize: 16, fontWeight: 'bold' },
    modalTitle: { color: '#e4e6eb', fontSize: 18, fontWeight: 'bold' },
    formContainer: { padding: 20 },
    inputLabel: { color: '#b0b3b8', fontSize: 14, marginBottom: 8, marginTop: 15 },
    input: {
        backgroundColor: '#242526', color: '#e4e6eb', padding: 15,
        borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#3a3b3c'
    },
    genderOptions: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 5,
    },
    genderButton: {
        flex: 1, padding: 10, borderWidth: 1, borderColor: '#3a3b3c',
        borderRadius: 10, alignItems: 'center', marginHorizontal: 5, backgroundColor: '#242526',
    },
    genderButtonSelected: {
        backgroundColor: '#0084ff', borderColor: '#0084ff',
    },
    genderText: { color: '#b0b3b8' },
    genderTextSelected: { color: '#fff', fontWeight: 'bold' },
});

export default ProfileScreen;
