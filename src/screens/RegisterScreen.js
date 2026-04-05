import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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

        // Enforce Day <= 31
        if (cleaned.length >= 2) {
            let day = parseInt(cleaned.slice(0, 2));
            if (day > 31) cleaned = '31' + cleaned.slice(2);
            if (day === 0 && cleaned.length === 2) cleaned = '01';
        }

        // Enforce Month <= 12
        if (cleaned.length >= 4) {
            let month = parseInt(cleaned.slice(2, 4));
            if (month > 12) cleaned = cleaned.slice(0, 2) + '12' + cleaned.slice(4);
            if (month === 0 && cleaned.length === 4) cleaned = cleaned.slice(0, 2) + '01'; // If 00 month, fix to 01
        }

        // Auto-format DD/MM/YYYY
        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        if (cleaned.length > 4) {
            formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4, 8);
        }

        setBirthday(formatted);
    };

    const navToLogin = () => navigation.navigate('Login');

    const handleRegister = async () => {
        if (!fullName || !birthday || !gender || !phone || !password || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
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
        <View style={{ flex: 1, backgroundColor: '#18191a' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

                    <Text style={styles.title}>Đăng Ký Tài Khoản</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Họ và tên"
                        placeholderTextColor="#aaa"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Ngày sinh (DD/MM/YYYY)"
                        placeholderTextColor="#aaa"
                        value={birthday}
                        onChangeText={handleDateChange}
                        keyboardType="numeric"
                        maxLength={10}
                    />

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

                    <TextInput
                        style={styles.input}
                        placeholder="Số điện thoại"
                        placeholderTextColor="#aaa"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Mật khẩu"
                            placeholderTextColor="#aaa"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#b0b3b8" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Nhập lại mật khẩu"
                            placeholderTextColor="#aaa"
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={24} color="#b0b3b8" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={inputLoading}>
                        {inputLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Đăng Ký</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.link}>Đã có tài khoản? Đăng nhập ngay</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#18191a',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#0084ff',
    },
    input: {
        borderWidth: 1,
        borderColor: '#3a3b3c',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#242526',
        color: '#e4e6eb',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3a3b3c',
        borderRadius: 10,
        marginBottom: 15,
        backgroundColor: '#242526',
    },
    passwordInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: '#e4e6eb',
    },
    eyeIcon: {
        padding: 10,
    },
    genderContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        color: '#b0b3b8',
    },
    genderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    genderButton: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#3a3b3c',
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5,
        backgroundColor: '#242526',
    },
    genderButtonSelected: {
        backgroundColor: '#0084ff',
        borderColor: '#0084ff',
    },
    genderText: {
        color: '#b0b3b8',
    },
    genderTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#0084ff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    link: {
        color: '#0084ff',
        textAlign: 'center',
        fontSize: 14,
    },
});

export default RegisterScreen;
