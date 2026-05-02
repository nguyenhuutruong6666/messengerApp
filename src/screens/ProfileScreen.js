import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

    const insets = useSafeAreaInsets();

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
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                <View style={styles.coverPhoto}>
                    <View style={[styles.topNav, { marginTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => navigation.navigate('Friends')} style={styles.topNavBtn}>
                            <Ionicons name="people-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.topNavBtn}>
                            <Ionicons name="notifications-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Header (Avatar overlaps cover) */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity
                        onPress={handleChangeAvatar}
                        disabled={uploadingAvatar}
                        style={styles.avatarWrapper}
                        activeOpacity={0.8}
                    >
                        <UserAvatar uri={userData.avatar} size={130} style={styles.avatarBorder} />

                        {uploadingAvatar && (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator color="#fff" size="large" />
                            </View>
                        )}

                        <View style={styles.cameraIconContainer}>
                            <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.name}>{userData.fullName}</Text>
                    <Text style={styles.phoneTag}>@{userData.phone}</Text>
                </View>

                {/* Content Section */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

                    <View style={styles.infoCard}>
                        <TouchableOpacity style={styles.settingsBtn} onPress={openEditModal}>
                            <Ionicons name="settings" size={18} color="#fff" />
                        </TouchableOpacity>
                        <InfoRow icon="call" label="Số điện thoại" value={userData.phone} />
                        <InfoRow icon="calendar" label="Ngày sinh" value={userData.birthday} />
                        <InfoRow icon="person" label="Giới tính" value={userData.gender} last />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>


                        <TouchableOpacity onPress={() => navigation.navigate('ChangePassword')} style={styles.changePasswordButton}>
                            <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.changePasswordText}>Đổi mật khẩu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Ionicons name="log-out-outline" size={20} color="#ff4b4b" style={{ marginRight: 8 }} />
                            <Text style={styles.logoutText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Modal chỉnh sửa (Bottom Sheet Style) */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.dragHandle} />

                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalBtn}>
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Chỉnh sửa</Text>
                            <TouchableOpacity onPress={handleSaveProfile} disabled={saving} style={styles.modalBtn}>
                                {saving ? <ActivityIndicator color="#0084ff" /> : <Text style={styles.saveText}>Lưu</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Họ và tên</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={editFullName}
                                        onChangeText={setEditFullName}
                                        placeholderTextColor="#8e8e93"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Ngày sinh (DD/MM/YYYY)</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="calendar-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={editBirthday}
                                        onChangeText={handleEditDateChange}
                                        placeholderTextColor="#8e8e93"
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
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
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const InfoRow = ({ icon, label, value, last }) => (
    <View style={[styles.infoItem, last && styles.infoItemLast]}>
        <View style={styles.infoIconWrapper}>
            <Ionicons name={icon} size={20} color="#0084ff" />
        </View>
        <View style={styles.infoTextWrapper}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value || '—'}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212',
    },
    container: {
        flex: 1, backgroundColor: '#121212',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 130,
    },
    coverPhoto: {
        width: '100%',
        height: 180,
        backgroundColor: '#242526',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    topNavBtn: {
        width: 44, height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    profileHeader: {
        alignItems: 'center',
        marginTop: -65,
        paddingHorizontal: 20,
    },
    avatarWrapper: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    avatarBorder: {
        borderWidth: 4,
        borderColor: '#121212',
    },
    avatarOverlay: {
        position: 'absolute', top: 0, left: 0,
        width: 130, height: 130, borderRadius: 65,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    cameraIconContainer: {
        position: 'absolute', bottom: 5, right: 5,
        backgroundColor: '#0084ff',
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#121212',
    },
    name: {
        fontSize: 26, fontWeight: '800', color: '#ffffff', marginTop: 12, letterSpacing: 0.5,
    },
    phoneTag: {
        fontSize: 15, color: '#0084ff', fontWeight: '600', marginTop: 4,
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden'
    },
    contentSection: {
        paddingHorizontal: 24,
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 18, fontWeight: 'bold', color: '#e4e6eb', marginBottom: 15,
    },
    infoCard: {
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#2c2c2e',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2c2c2e',
        paddingBottom: 16,
    },
    infoItemLast: {
        borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0,
    },
    infoIconWrapper: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(0, 132, 255, 0.1)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    infoTextWrapper: {
        flex: 1,
    },
    label: { color: '#8e8e93', fontSize: 14, marginBottom: 4 },
    value: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

    actionButtons: {
        marginTop: 10,
    },
    settingsBtn: {
        position: 'absolute',
        top: -18,
        right: 15,
        backgroundColor: '#0084ff',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        borderWidth: 3,
        borderColor: '#121212',
    },
    changePasswordButton: {
        backgroundColor: '#3a3b3c',
        height: 56, borderRadius: 16,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        marginBottom: 16,
    },
    changePasswordText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    logoutButton: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        height: 56, borderRadius: 16,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    logoutText: { color: '#ff4b4b', fontSize: 16, fontWeight: 'bold' },


    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    bottomSheet: {
        backgroundColor: '#1e1e1e',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '90%',
    },
    dragHandle: {
        width: 40, height: 5, borderRadius: 3,
        backgroundColor: '#3a3b3c',
        alignSelf: 'center',
        marginTop: 12, marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: '#2c2c2e',
    },
    modalBtn: { padding: 5 },
    cancelText: { color: '#8e8e93', fontSize: 16, fontWeight: '500' },
    saveText: { color: '#0084ff', fontSize: 16, fontWeight: 'bold' },
    modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    formContainer: { padding: 24 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { color: '#e4e6eb', fontSize: 15, fontWeight: '500', marginBottom: 10, marginLeft: 4 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#121212',
        borderRadius: 14,
        borderWidth: 1, borderColor: '#2c2c2e',
        paddingHorizontal: 16, height: 56,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: '#ffffff', height: '100%' },
    genderOptions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    genderButton: {
        flex: 1, height: 50, borderRadius: 14,
        borderWidth: 1, borderColor: '#2c2c2e',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212',
    },
    genderButtonSelected: {
        backgroundColor: '#0084ff', borderColor: '#0084ff',
    },
    genderText: { color: '#b0b3b8', fontSize: 15, fontWeight: '600' },
    genderTextSelected: { color: '#ffffff', fontWeight: 'bold' },
});

export default ProfileScreen;
