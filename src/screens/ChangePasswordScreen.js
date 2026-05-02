import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const ChangePasswordScreen = ({ navigation }) => {
    const { user } = useAuth();
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);

    const handleChangePassword = () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới không khớp.');
            return;
        }

        Alert.alert(
            'Xác nhận',
            'Bạn có chắc chắn muốn đổi mật khẩu không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đổi mật khẩu',
                    style: 'destructive',
                    onPress: executePasswordChange
                }
            ]
        );
    };

    const executePasswordChange = async () => {
        setLoading(true);
        try {
            
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);

            
            await updatePassword(user, newPassword);

            Alert.alert('Thành công', 'Đổi mật khẩu thành công!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                Alert.alert('Lỗi', 'Mật khẩu cũ không chính xác.');
            } else if (error.code === 'auth/too-many-requests') {
                Alert.alert('Lỗi', 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.');
            } else {
                Alert.alert('Lỗi', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={26} color="#e4e6eb" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Đổi mật khẩu</Text>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.formContainer}>
                        <Text style={styles.description}>
                            Mật khẩu của bạn phải có ít nhất 6 ký tự và bao gồm sự kết hợp của chữ số, chữ cái và ký tự đặc biệt.
                        </Text>

                        {/* Old Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showOldPassword}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                />
                                <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showOldPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập mật khẩu mới"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showNewPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập lại mật khẩu mới"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.saveButton} 
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Đổi Mật Khẩu</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 15,
        marginBottom: 20,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#242526',
        justifyContent: 'center', alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#e4e6eb',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    description: {
        fontSize: 14,
        color: '#b0b3b8',
        marginBottom: 30,
        lineHeight: 22,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 15,
        color: '#e4e6eb',
        fontWeight: '500',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2c2c2e',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#ffffff',
        height: '100%',
    },
    eyeIcon: {
        padding: 4,
    },
    saveButton: {
        backgroundColor: '#0084ff',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    }
});

export default ChangePasswordScreen;
