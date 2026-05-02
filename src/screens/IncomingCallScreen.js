import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Image, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { subscribeToMessages, sendMessage } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

const IncomingCallScreen = ({ route }) => {
    const { roomName, friend, isVideo } = route.params;
    const navigation = useNavigation();
    const { user } = useAuth();
    const chatId = [user.uid, friend.id].sort().join('_');

    // Pulse animation
    const pulse1 = useRef(new Animated.Value(1)).current;
    const pulse2 = useRef(new Animated.Value(1)).current;
    const pulse1Opacity = useRef(new Animated.Value(0.35)).current;
    const pulse2Opacity = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.stagger(700, [
                Animated.parallel([
                    Animated.timing(pulse1, { toValue: 1.28, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse1Opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(pulse2, { toValue: 1.28, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse2Opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
                ]),
            ])
        );
        anim.start();
        return () => {
            anim.stop();
            pulse1.setValue(1); pulse2.setValue(1);
            pulse1Opacity.setValue(0.35); pulse2Opacity.setValue(0.2);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToMessages(chatId, (messages) => {
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                // Nếu người gọi đã dập máy (gửi tin nhắn nhỡ hoặc kết thúc)
                if (lastMsg.senderId === friend.id && 
                    (lastMsg.text === '📞 Cuộc gọi nhỡ' || lastMsg.text === '📞 Cuộc gọi kết thúc')) {
                    if (Date.now() - lastMsg.createdAt < 30000) {
                        navigation.goBack();
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [chatId]);

    const handleAccept = () => {
        navigation.replace('VideoCall', { roomName, friend, isVideo, isCaller: false, chatId });
    };

    const handleDecline = async () => {
        await sendMessage(chatId, '📞 Từ chối cuộc gọi', [], user.uid);
        navigation.goBack();
    };

    const firstLetter = (friend.fullName || '?').trim()[0].toUpperCase();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#5AC8FA', '#2EA5DC', '#1A7FBF']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
            />

            {/* Decorative clouds */}
            <View style={styles.cloudWrap} pointerEvents="none">
                <View style={[styles.cloud, { top: 110, left: -20, width: 120, height: 50 }]} />
                <View style={[styles.cloud, { top: 90, right: -30, width: 100, height: 42 }]} />
                <View style={[styles.cloud, { top: 160, left: 40, width: 80, height: 34 }]} />
            </View>

            <SafeAreaView style={styles.content} edges={['top', 'bottom']}>

                {/* ── TOP ── */}
                <View style={styles.topSection}>
                    <Text style={styles.appTitle}>Messta</Text>
                    <Text style={styles.incomingLabel}>Cuộc gọi thoại đến...</Text>

                    {/* Avatar with pulse rings */}
                    <View style={styles.avatarArea}>
                        <Animated.View style={[styles.pulseRing, {
                            transform: [{ scale: pulse1 }],
                            opacity: pulse1Opacity,
                        }]} />
                        <Animated.View style={[styles.pulseRing, styles.pulseRing2, {
                            transform: [{ scale: pulse2 }],
                            opacity: pulse2Opacity,
                        }]} />

                        <View style={styles.avatarOuter}>
                            <View style={styles.avatarInner}>
                                {friend.avatar ? (
                                    <Image
                                        source={{ uri: friend.avatar }}
                                        style={styles.avatarImg}
                                        onError={() => {}}
                                    />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarLetter}>{firstLetter}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    <Text style={styles.friendName}>{friend.fullName}</Text>
                    <Text style={styles.callTypeText}>
                        <Ionicons name="call" size={13} color="rgba(255,255,255,0.8)" />
                        {'  '}Cuộc gọi thoại
                    </Text>
                </View>

                {/* ── CITY DECO ── */}
                <View style={styles.decoWrap} pointerEvents="none">
                    <View style={styles.decoBuildings}>
                        {[
                            { h: 55, w: 22, l: 10 }, { h: 80, w: 30, l: 38 }, { h: 45, w: 18, l: 74 },
                            { h: 90, w: 34, l: 98 }, { h: 60, w: 24, l: 138 }, { h: 75, w: 28, l: 168 },
                            { h: 50, w: 20, l: 202 }, { h: 88, w: 32, l: 228 }, { h: 58, w: 22, l: 266 },
                            { h: 70, w: 26, l: 294 }, { h: 48, w: 18, l: 326 }, { h: 65, w: 24, l: 350 },
                        ].map((b, i) => (
                            <View key={i} style={[styles.building, {
                                height: b.h, width: b.w, left: b.l,
                                bottom: 0, opacity: 0.18,
                            }]} />
                        ))}
                    </View>
                </View>

                {/* ── BOTTOM CONTROLS ── */}
                <View style={styles.bottomBar}>
                    <View style={styles.btnRow}>

                        {/* Từ chối */}
                        <View style={styles.btnWrap}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.declineBtn]}
                                onPress={handleDecline}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={28} color="#fff"
                                    style={{ transform: [{ rotate: '135deg' }] }} />
                            </TouchableOpacity>
                            <Text style={styles.btnLabel}>Từ chối</Text>
                        </View>

                        {/* Chấp nhận */}
                        <View style={styles.btnWrap}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.acceptBtn]}
                                onPress={handleAccept}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.btnLabel}>Chấp nhận</Text>
                        </View>

                    </View>
                </View>

            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    cloudWrap: { ...StyleSheet.absoluteFillObject },
    cloud: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 50,
    },

    content: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },

    // Top
    topSection: { alignItems: 'center', marginTop: 12, width: '100%' },
    appTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
    incomingLabel: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 32, fontWeight: '400' },

    // Avatar
    avatarArea: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    pulseRing: {
        position: 'absolute',
        width: 170, height: 170, borderRadius: 85,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    pulseRing2: { width: 190, height: 190, borderRadius: 95 },
    avatarOuter: {
        width: 154, height: 154, borderRadius: 77,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInner: {
        width: 132, height: 132, borderRadius: 66,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 132, height: 132, borderRadius: 66 },
    avatarFallback: {
        width: 132, height: 132, borderRadius: 66,
        backgroundColor: '#1a3a5c',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarLetter: { fontSize: 52, fontWeight: '700', color: '#fff' },

    friendName: { fontSize: 30, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
    callTypeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

    // Deco
    decoWrap: { width: '100%', height: 95, position: 'relative', overflow: 'hidden' },
    decoBuildings: { ...StyleSheet.absoluteFillObject },
    building: { position: 'absolute', backgroundColor: '#fff', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    // Bottom
    bottomBar: {
        width: '100%',
        paddingBottom: 10,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    btnRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' },
    btnWrap: { alignItems: 'center', gap: 10 },
    actionBtn: {
        width: 70, height: 70, borderRadius: 35,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    declineBtn: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
    },
    acceptBtn: {
        backgroundColor: '#34C759',
        shadowColor: '#34C759',
    },
    btnLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
});

export default IncomingCallScreen;
