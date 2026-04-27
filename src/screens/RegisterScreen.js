import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ImageBackground } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState('Nam');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [inputLoading, setInputLoading] = useState(false);

    const { register } = useAuth();

    const handleDateChange = (text) => {
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

        setBirthday(formatted);
    };

    const handleRegister = async () => {
        if (!fullName || !birthday || !gender || !phone || !password || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
            return;
        }

        const dateParts = birthday.split('/');
        if (dateParts.length !== 3) {
            Alert.alert('Lỗi', 'Ngày sinh không đúng định dạng DD/MM/YYYY');
            return;
        }

        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);

        if (year < 1900 || year > new Date().getFullYear()) {
            Alert.alert('Lỗi', 'Năm sinh không hợp lệ');
            return;
        }
        if (month < 1 || month > 12) {
            Alert.alert('Lỗi', 'Tháng không hợp lệ');
            return;
        }

        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            Alert.alert('Lỗi', `Tháng ${month} chỉ có ${daysInMonth} ngày.`);
            return;
        }

        if (!['Nam', 'Nữ', 'Khác'].includes(gender)) {
            Alert.alert('Lỗi', 'Giới tính không hợp lệ');
            return;
        }

        setInputLoading(true);
        try {
            const email = `${phone}@messenger.app`;

            const additionalData = {
                fullName,
                birthday,
                gender,
                phone,
                avatar: '',
            };

            await register(email, password, additionalData);
            Alert.alert('Thành công', 'Tạo tài khoản thành công!');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Đăng ký thất bại', 'Số điện thoại này đã được đăng ký.');
            } else if (error.code === 'auth/invalid-email') {
                Alert.alert('Đăng ký thất bại', 'Số điện thoại không hợp lệ.');
            } else if (error.code === 'auth/weak-password') {
                Alert.alert('Đăng ký thất bại', 'Mật khẩu quá yếu (tối thiểu 6 ký tự).');
            } else {
                Alert.alert('Đăng ký thất bại', error.message);
            }
        } finally {
            setInputLoading(false);
        }
    };

    return (
        <ImageBackground source={require('../../assets/starry_sky.png')} style={styles.background} resizeMode="cover">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.header}>
                            <View style={styles.headerTopRow}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Tạo tài khoản</Text>
                                <View style={styles.rightPlaceholder} />
                            </View>
                            <Text style={styles.subtitle}>Tham gia với chúng tôi ngay hôm nay</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Họ và tên"
                                    placeholderTextColor="#8e8e93"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ngày sinh (DD/MM/YYYY)"
                                    placeholderTextColor="#8e8e93"
                                    value={birthday}
                                    onChangeText={handleDateChange}
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>

                            <View style={styles.genderContainer}>
                                <Text style={styles.label}>Giới tính:</Text>
                                <View style={styles.genderOptions}>
                                    {['Nam', 'Nữ', 'Khác'].map((g) => (
                                        <TouchableOpacity
                                            key={g}
                                            style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                                            onPress={() => setGender(g)}
                                        >
                                            <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Số điện thoại"
                                    placeholderTextColor="#8e8e93"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mật khẩu"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="shield-checkmark-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nhập lại mật khẩu"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={inputLoading}>
                                {inputLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Đăng Ký</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.link}>Đăng nhập ngay</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 28,
        paddingTop: 60,
        paddingBottom: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    header: {
        marginBottom: 32,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5,
        textAlign: 'center',
        flex: 1,
    },
    rightPlaceholder: {
        width: 40,
    },
    subtitle: {
        fontSize: 15,
        color: '#e4e6eb',
        fontWeight: '500',
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 30, 30, 0.65)',
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#e4e6eb',
        height: '100%',
    },
    eyeIcon: {
        padding: 4,
    },
    genderContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        marginBottom: 10,
        color: '#e4e6eb',
        fontWeight: '500',
        marginLeft: 4,
    },
    genderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    genderButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 30, 30, 0.65)',
    },
    genderButtonSelected: {
        backgroundColor: '#0084ff',
        borderColor: '#0084ff',
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    genderText: {
        color: '#b0b3b8',
        fontSize: 15,
        fontWeight: '600',
    },
    genderTextSelected: {
        color: '#ffffff',
    },
    button: {
        backgroundColor: '#0084ff',
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 24,
        shadowColor: '#0084ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: '#e4e6eb',
        fontSize: 15,
    },
    link: {
        color: '#4db8ff',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default RegisterScreen;

