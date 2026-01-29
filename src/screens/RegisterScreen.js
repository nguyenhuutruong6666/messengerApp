import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState('Nam'); // Default selection
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [inputLoading, setInputLoading] = useState(false);

    const { register } = useAuth();

    const handleRegister = async () => {
        // Basic Validation
        if (!fullName || !birthday || !gender || !phone || !password) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
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
                avatar: '', // Default to empty to show person icon
            };

            await register(email, password, additionalData);
            Alert.alert('Thành công', 'Tạo tài khoản thành công!');
        } catch (error) {
            console.error(error);
            Alert.alert('Đăng ký thất bại', error.message);
        } finally {
            setInputLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#18191a' }}>
            <ScrollView contentContainerStyle={styles.container}>

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
                    onChangeText={setBirthday}
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
