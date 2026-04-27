import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard, Image, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPhoneFocused, setIsPhoneFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
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
        <ImageBackground source={require('../../assets/starry_sky.png')} style={styles.background} resizeMode="cover">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.inner}>
                        <View style={styles.header}>
                            <Image source={require('../../assets/logo.png')} style={styles.logo} />
                            <Text style={styles.title}>Messta</Text>
                            <Text style={styles.subtitle}>Kết nối mọi người</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={[styles.inputContainer, { justifyContent: 'flex-start' }]}>
                                <Ionicons name="call-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Số điện thoại"
                                    placeholderTextColor="#8e8e93"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    onFocus={() => setIsPhoneFocused(true)}
                                    onBlur={() => setIsPhoneFocused(false)}
                                />
                            </View>

                            <View style={[styles.inputContainer, { justifyContent: 'flex-start' }]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#b0b3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Mật khẩu"
                                    placeholderTextColor="#8e8e93"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#8e8e93" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Đăng Nhập</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={styles.link}>Đăng ký ngay</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
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
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Thêm lớp phủ mờ để dễ đọc text hơn
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 16,
        borderRadius: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#e4e6eb',
        fontWeight: '500',
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
    button: {
        backgroundColor: '#0084ff',
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
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
        marginTop: 24,
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

export default LoginScreen;
