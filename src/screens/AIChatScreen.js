import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    StatusBar, SafeAreaView, Keyboard, Animated, Image, ActivityIndicator,
    Modal, Alert, Dimensions
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const GEMINI_API_KEY = 'AIzaSyAk6lsWySXDlfE8myJoEy8t6QOW8OSv_mU';

const MODELS = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-pro'];
const makeUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;


const buildImageUrl = (prompt) =>
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`;

const IMAGE_KEYWORDS = [
    'tạo ảnh', 'vẽ', 'tạo hình', 'sinh ảnh', 'hãy vẽ', 'vẽ cho',
    'generate image', 'create image', 'draw', 'make image', 'picture of',
    'tạo một bức', 'tạo bức ảnh', 'image of', 'photo of', 'tạo hình ảnh',
];

const isImageRequest = (text) =>
    IMAGE_KEYWORDS.some(kw => text.toLowerCase().includes(kw));


const parseApiError = (errMsg) => {
    if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        const retryMatch = errMsg.match(/retry in (\d+(\.\d+)?)s/i);
        const seconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        return { friendly: `⏳ AI đang bận, vui lòng thử lại sau ${seconds} giây.`, retryAfter: seconds };
    }
    if (errMsg.includes('API_KEY') || errMsg.includes('401') || errMsg.includes('403')) {
        return { friendly: '🔑 API key không hợp lệ hoặc chưa được kích hoạt.' };
    }
    if (errMsg.includes('not found') || errMsg.includes('404')) {
        return { friendly: '❌ Model AI không khả dụng, vui lòng thử lại.' };
    }
    if (errMsg.includes('network') || errMsg.includes('fetch')) {
        return { friendly: '📶 Lỗi kết nối mạng, kiểm tra internet và thử lại.' };
    }
    return { friendly: '⚠️ Đã xảy ra lỗi. Vui lòng thử lại sau.' };
};

const SYSTEM_PROMPT = `Bạn là trợ lý AI tên "Messta AI" trong ứng dụng nhắn tin Messta. Hãy trả lời thân thiện, hữu ích bằng tiếng Việt. Nếu người dùng hỏi bằng tiếng Anh thì trả lời tiếng Anh.`;


const TypingDots = () => {
    const d = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        d.forEach((dot, i) =>
            Animated.loop(Animated.sequence([
                Animated.delay(i * 150),
                Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.delay(600),
            ])).start()
        );
    }, []);
    return (
        <View style={styles.typingRow}>
            <LinearGradient colors={['#6d28d9', '#7c3aed']} style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={12} color="#fff" />
            </LinearGradient>
            <View style={styles.typingBubble}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    {d.map((dot, i) => (
                        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
                    ))}
                </View>
            </View>
        </View>
    );
};


const RetryBubble = ({ seconds, onRetry }) => {
    const [count, setCount] = useState(seconds);
    useEffect(() => {
        if (count <= 0) { onRetry(); return; }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [count]);
    return (
        <View style={styles.retryBubble}>
            <Ionicons name="time-outline" size={16} color="#a78bfa" />
            <Text style={styles.retryText}>
                {count > 0 ? `Tự động thử lại sau ${count}s...` : 'Đang thử lại...'}
            </Text>
        </View>
    );
};


const ImageWithFallback = ({ uri, onPress }) => {
    const [status, setStatus] = useState('loading'); 
    return (
        <View style={styles.imgContainer}>
            {status !== 'error' && (
                <TouchableOpacity onPress={() => status === 'loaded' && onPress(uri)} activeOpacity={0.9}>
                    <Image
                        source={{ uri }}
                        style={styles.generatedImg}
                        resizeMode="cover"
                        onLoad={() => setStatus('loaded')}
                        onError={() => setStatus('error')}
                    />
                </TouchableOpacity>
            )}
            {status === 'loading' && (
                <View style={styles.imgLoaderOverlay}>
                    <ActivityIndicator color="#a78bfa" size="large" />
                    <Text style={{ color: '#a78bfa', marginTop: 8, fontSize: 12 }}>Đang tải ảnh...</Text>
                </View>
            )}
            {status === 'error' && (
                <View style={[styles.imgLoaderOverlay, { backgroundColor: '#1a0a1a' }]}>
                    <Ionicons name="image-outline" size={40} color="#5a5a7a" />
                    <Text style={{ color: '#5a5a7a', marginTop: 8, fontSize: 13, textAlign: 'center' }}>
                        Không tải được ảnh.{'\n'}Thử lại bằng cách gửi yêu cầu mới.
                    </Text>
                </View>
            )}
        </View>
    );
};

const AIChatScreen = () => {
    const navigation = useNavigation();
    const [messages, setMessages] = useState([{
        id: 'welcome', role: 'model',
        text: 'Xin chào! Tôi là Messta AI 🤖✨\nTôi có thể:\n• 💬 Trả lời mọi câu hỏi của bạn\n• 🎨 Tạo ảnh AI theo yêu cầu\n\nHãy thử: "Vẽ một chú mèo dễ thương"',
        createdAt: Date.now(),
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingType, setLoadingType] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [pendingRetry, setPendingRetry] = useState(null); 
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const flatListRef = useRef();

    const handleOpenImage = (uri) => {
        setSelectedImage(uri);
        setViewerVisible(true);
    };

    const handleDownload = async () => {
        if (!selectedImage) return;
        setDownloading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để tải xuống.');
                return;
            }

            const filename = `MesstaAI_${Date.now()}.jpg`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;
            const downloadRes = await FileSystem.downloadAsync(selectedImage, fileUri);

            if (downloadRes.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                Alert.alert('Thành công', 'Đã lưu ảnh vào thư viện của bạn! 🎉');
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi', 'Không thể tải ảnh xuống lúc này.');
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        const s1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
        const s2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
        return () => { s1.remove(); s2.remove(); };
    }, []);

    const callChat = async (userText, history) => {
        const contents = [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Tôi hiểu, tôi là Messta AI.' }] },
            ...history
                .filter(m => m.id !== 'welcome' && !m.imageUrl && !m.isError && !m.isRetry)
                .slice(-16)
                .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
            { role: 'user', parts: [{ text: userText }] }
        ];

        
        let lastError = null;
        for (const model of MODELS) {
            try {
                const res = await fetch(makeUrl(model), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents }),
                });
                if (!res.ok) {
                    const e = await res.json();
                    const msg = e?.error?.message || `HTTP ${res.status}`;
                    
                    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || res.status === 429) {
                        throw new Error(msg);
                    }
                    lastError = new Error(msg);
                    continue; 
                }
                const data = await res.json();
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
            } catch (err) {
                if (err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) throw err;
                lastError = err;
            }
        }
        throw lastError || new Error('Tất cả model đều không khả dụng');
    };

    const doSend = async (text, skipUserMsg = false) => {
        setPendingRetry(null);
        setLoading(true);
        const isImg = isImageRequest(text);
        setLoadingType(isImg ? 'image' : 'text');

        let userMsg = null;
        if (!skipUserMsg) {
            userMsg = { id: `u_${Date.now()}`, role: 'user', text, createdAt: Date.now() };
            setMessages(prev => [...prev, userMsg]);
        }

        try {
            if (isImg) {
                
                const confirmId = `ai_c_${Date.now()}`;
                setMessages(prev => [...prev, {
                    id: confirmId, role: 'model',
                    text: '🎨 Đang tạo ảnh cho bạn...',
                    createdAt: Date.now()
                }]);

                
                await new Promise(r => setTimeout(r, 500));
                const imageUrl = buildImageUrl(text);

                setMessages(prev => [
                    ...prev.filter(m => m.id !== confirmId),
                    {
                        id: `ai_img_${Date.now()}`, role: 'model',
                        text: '✅ Đây là ảnh AI tôi tạo cho bạn!',
                        imageUrl, createdAt: Date.now()
                    }
                ]);
            } else {
                const currentMessages = userMsg
                    ? [...messages, userMsg]
                    : messages;
                const aiText = await callChat(text, currentMessages);
                setMessages(prev => [...prev, {
                    id: `ai_${Date.now()}`, role: 'model',
                    text: aiText, createdAt: Date.now()
                }]);
            }
        } catch (err) {
            const { friendly, retryAfter } = parseApiError(err.message || '');
            setMessages(prev => [...prev, {
                id: `err_${Date.now()}`, role: 'model',
                text: friendly, isError: true, createdAt: Date.now()
            }]);
            if (retryAfter) {
                setPendingRetry({ text, seconds: retryAfter });
            }
        } finally {
            setLoading(false);
            setLoadingType('');
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        Keyboard.dismiss();
        await doSend(text);
    };

    const handleRetry = () => {
        if (pendingRetry) doSend(pendingRetry.text, true);
    };

    const fmt = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        if (isUser) {
            return (
                <View style={[styles.msgRow, { justifyContent: 'flex-end' }]}>
                    <LinearGradient colors={['#0084FF', '#00C6FF']} style={styles.userBubble} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <Text style={styles.userText}>{item.text}</Text>
                        <Text style={styles.timeR}>{fmt(item.createdAt)}</Text>
                    </LinearGradient>
                </View>
            );
        }
        return (
            <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
                <LinearGradient colors={['#6d28d9', '#7c3aed']} style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                </LinearGradient>
                <View style={[styles.aiBubble, item.isError && styles.errBubble]}>
                    {item.imageUrl ? (
                        <>
                            <ImageWithFallback uri={item.imageUrl} onPress={handleOpenImage} />
                            <Text style={[styles.aiText, { marginTop: 6 }]}>{item.text}</Text>
                        </>
                    ) : (
                        <Text style={[styles.aiText, item.isError && { color: '#ff8888' }]}>
                            {item.text}
                        </Text>
                    )}
                    <Text style={styles.timeL}>{fmt(item.createdAt)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.headerWrap}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <LinearGradient colors={['#6d28d9', '#a78bfa']} style={styles.headerAvatar}>
                            <Ionicons name="sparkles" size={18} color="#fff" />
                        </LinearGradient>
                        <View>
                            <Text style={styles.headerName}>Messta AI</Text>
                            <Text style={styles.headerSub}>✨ Chat & Tạo ảnh AI</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={i => i.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loading ? (
                            loadingType === 'image' ? (
                                <View style={styles.imgLoadWrap}>
                                    <LinearGradient colors={['#6d28d9', '#a78bfa']} style={styles.imgLoadBox}>
                                        <Ionicons name="image-outline" size={28} color="#fff" />
                                        <Text style={styles.imgLoadText}>Đang vẽ ảnh AI...</Text>
                                    </LinearGradient>
                                </View>
                            ) : <TypingDots />
                        ) : pendingRetry ? (
                            <RetryBubble seconds={pendingRetry.seconds} onRetry={handleRetry} />
                        ) : null
                    }
                />

                <View style={[styles.inputWrap, {
                    paddingBottom: isKeyboardVisible
                        ? (Platform.OS === 'ios' ? 10 : 8)
                        : (Platform.OS === 'ios' ? 28 : 14)
                }]}>
                    {/* Gợi ý nhanh */}
                    {messages.length <= 1 && (
                        <View style={styles.suggestRow}>
                            {['🐱 Vẽ mèo cute', '🌅 Vẽ hoàng hôn', '🤔 Giải thích AI là gì'].map(s => (
                                <TouchableOpacity key={s} style={styles.suggest} onPress={() => setInput(s.slice(3))}>
                                    <Text style={styles.suggestText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Hỏi hoặc 'Vẽ...' để tạo ảnh AI"
                            placeholderTextColor="#5a5a7a"
                            value={input}
                            onChangeText={setInput}
                            multiline
                            maxLength={2000}
                        />
                        <TouchableOpacity onPress={handleSend} disabled={loading || !input.trim()} activeOpacity={0.7}>
                            {input.trim() ? (
                                <LinearGradient colors={['#6d28d9', '#a78bfa']} style={styles.sendBtn}>
                                    <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
                                </LinearGradient>
                            ) : (
                                <View style={[styles.sendBtn, { backgroundColor: 'transparent' }]}>
                                    <Ionicons name="send" size={18} color="#3a3a5a" style={{ marginLeft: 2 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Full Image Viewer Modal */}
            <Modal visible={viewerVisible} transparent={true} animationType="fade">
                <View style={styles.viewerContainer}>
                    <TouchableOpacity 
                        style={styles.viewerClose} 
                        onPress={() => setViewerVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>

                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={styles.viewerImage} 
                            resizeMode="contain" 
                        />
                    )}

                    <TouchableOpacity 
                        style={styles.downloadBtn} 
                        onPress={handleDownload}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={24} color="#fff" />
                                <Text style={styles.downloadBtnText}>Lưu ảnh</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0d0d1a' },
    headerWrap: { backgroundColor: '#0d0d1a', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    headerAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    headerSub: { color: '#a78bfa', fontSize: 12 },
    list: { padding: 16, paddingBottom: 8 },
    msgRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    aiAvatar: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
    userBubble: { maxWidth: '78%', borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
    userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    aiBubble: { maxWidth: '78%', backgroundColor: '#1a1a2e', borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: '#2a2a4a' },
    aiText: { color: '#e4e4f4', fontSize: 15, lineHeight: 22 },
    errBubble: { borderColor: '#4a1a1a', backgroundColor: '#1a0808' },
    timeR: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeL: { color: '#5a5a7a', fontSize: 10, marginTop: 4 },
    generatedImg: { width: 220, height: 220, borderRadius: 14 },
    imgContainer: { width: 220, height: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d0d1a' },
    imgLoaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 14 },
    typingRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    typingBubble: { backgroundColor: '#1a1a2e', borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: '#2a2a4a' },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#a78bfa' },
    imgLoadWrap: { flexDirection: 'row', marginBottom: 16, paddingLeft: 36 },
    imgLoadBox: { borderRadius: 16, padding: 14, alignItems: 'center', flexDirection: 'row', gap: 10 },
    imgLoadText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    retryBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 36 },
    retryText: { color: '#a78bfa', fontSize: 13, fontStyle: 'italic' },
    inputWrap: { backgroundColor: '#0d0d1a', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1a1a2e' },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    suggest: { backgroundColor: '#1a1a2e', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a4a' },
    suggestText: { color: '#a78bfa', fontSize: 13 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#1a1a2e', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: '#2a2a4a' },
    input: { flex: 1, color: '#e4e4f4', fontSize: 15, maxHeight: 100, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, paddingRight: 8 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    
    
    viewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerClose: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    viewerImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.7,
    },
    downloadBtn: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6d28d9',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 8,
    },
    downloadBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AIChatScreen;
