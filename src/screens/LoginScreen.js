import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
    // ...
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!phone || !password) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }

        setLoading(true);
        try {
            const email = `${phone}@messenger.app`;
            await login(email, password);
        } catch (error) {
            console.error(error);
            Alert.alert('Đăng nhập thất bại', 'Số điện thoại hoặc mật khẩu không đúng');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                <Text style={styles.title}>Đăng Nhập</Text>

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

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Đăng nhập</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.link}>Chưa có tài khoản? Đăng ký ngay</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#18191a', // Dark Background
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
        backgroundColor: '#242526', // Dark Input
        color: '#e4e6eb', // Light Text
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
    button: {
        backgroundColor: '#0084ff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
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

export default LoginScreen;
