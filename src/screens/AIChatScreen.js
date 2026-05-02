import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    StatusBar, Keyboard, Animated, Image, ActivityIndicator,
    Modal, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const GEMINI_API_KEY = 'AIzaSyAk6lsWySXDlfE8myJoEy8t6QOW8OSv_mU';

// ============================================================
// PRIMARY: Pollinations Text API — Hoàn toàn miễn phí, không cần API key
// ============================================================
const POLLINATIONS_CHAT_URL = 'https://text.pollinations.ai/openai';
const POLLINATIONS_MODELS = ['openai', 'openai-large', 'mistral', 'llama'];

// ============================================================
// FALLBACK: Gemini — dùng nếu Pollinations không phản hồi
// ============================================================
const GEMINI_CONFIGS = [
    { model: 'gemini-2.0-flash-lite', version: 'v1beta' },
    { model: 'gemini-2.0-flash', version: 'v1beta' },
    { model: 'gemini-1.5-flash', version: 'v1' },
    { model: 'gemini-1.0-pro', version: 'v1' },
];
const makeGeminiUrl = (model, version) =>
    `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;


const buildImageUrl = (prompt) =>
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

const IMAGE_KEYWORDS = [
    'tạo ảnh', 'vẽ', 'tạo hình', 'sinh ảnh', 'hãy vẽ', 'vẽ cho',
    'generate image', 'create image', 'draw', 'make image', 'picture of',
    'tạo một bức', 'tạo bức ảnh', 'image of', 'photo of', 'tạo hình ảnh',
];

const isImageRequest = (text) => {
    const lower = text.toLowerCase().trim();
    if (lower.length < 3) return false;
    return IMAGE_KEYWORDS.some(kw => lower.includes(kw));
};


const parseApiError = (errMsg) => {
    if (!errMsg) return { friendly: 'Đã xảy ra lỗi. Vui lòng thử lại.' };
    if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        const retryMatch = errMsg.match(/retry in (\d+(\.\d+)?)s/i);
        const seconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        return { friendly: `AI đang bận, tự động thử lại sau ${seconds} giây.`, retryAfter: seconds };
    }
    if (errMsg.includes('network') || errMsg.includes('Network') || errMsg.includes('fetch')) {
        return { friendly: 'Lỗi kết nối mạng. Kiểm tra internet và thử lại.' };
    }
    if (errMsg.includes('Không thể kết nối AI') || errMsg.includes('kiểm tra mạng')) {
        return { friendly: 'Không thể kết nối AI lúc này. Kiểm tra mạng và thử lại.' };
    }
    return { friendly: 'AI tạm thời không phản hồi. Vui lòng thử lại sau.' };
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
        text: 'Xin chào! Tôi là Messta AI 🤖✨\nTôi có thể:\n• Trả lời mọi câu hỏi của bạn\n• Tạo ảnh AI theo yêu cầu\n\nHãy thử: "Vẽ một chú mèo dễ thương"',
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
    // Concurrency: track active request để cancel khi có request mới
    const activeRequestIdRef = useRef(null);
    const activeControllerRef = useRef(null);
    const messageQueueRef = useRef([]);
    const isProcessingRef = useRef(false);

    const clearHistory = () => {
        Alert.alert(
            'Xóa lịch sử',
            'Bạn có muốn xóa toàn bộ lịch sử chat để bắt đầu mới không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => setMessages([{
                        id: 'welcome', role: 'model',
                        text: 'Chào bạn! Lịch sử đã được làm mới. Tôi có thể giúp gì cho bạn?',
                        createdAt: Date.now(),
                    }])
                }
            ]
        );
    };

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
                Alert.alert('Thành công', 'Đã lưu ảnh vào thư viện của bạn!');
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
        const historyFiltered = history
            .filter(m => m.id !== 'welcome' && !m.imageUrl && !m.isError && !m.isRetry)
            .slice(-10);

        // ==================================================
        // BƯỚC 1: Thử Pollinations AI (miễn phí, không cần API key, không có quota)
        // ==================================================
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyFiltered.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.text,
            })),
            { role: 'user', content: userText },
        ];

        for (const model of POLLINATIONS_MODELS) {
            try {
                console.log(`[AI] Pollinations → ${model}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const res = await fetch(POLLINATIONS_CHAT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, private: true }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    const text = data?.choices?.[0]?.message?.content;
                    if (text && text.trim()) {
                        console.log(`[AI] Pollinations thành công: ${model}`);
                        return text.trim();
                    }
                }
                console.log(`[AI] Pollinations ${model}: HTTP ${res.status}`);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log(`[AI] Pollinations ${model}: timeout`);
                } else {
                    console.log(`[AI] Pollinations ${model}: ${err.message.slice(0, 60)}`);
                }
            }
        }

        // ==================================================
        // BƯỚC 2: Fallback sang Gemini (nếu Pollinations không phản hồi)
        // ==================================================
        console.log('[AI] Pollinations thất bại → thử Gemini...');
        const contents = [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Tôi hiểu, tôi là Messta AI.' }] },
            ...historyFiltered.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }],
            })),
            { role: 'user', parts: [{ text: userText }] },
        ];

        for (const { model, version } of GEMINI_CONFIGS) {
            try {
                console.log(`[AI] Gemini → ${model} (${version})`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);

                const res = await fetch(makeGeminiUrl(model, version), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    let msg = `HTTP ${res.status}`;
                    try { const e = await res.json(); msg = e?.error?.message || msg; } catch (_) { }
                    console.log(`[AI] Gemini ${model}: ${msg.slice(0, 80)}`);
                    if (res.status === 401 || res.status === 403) break;
                    continue;
                }

                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim()) {
                    console.log(`[AI] Gemini thành công: ${model}`);
                    return text.trim();
                }
            } catch (err) {
                console.log(`[AI] Gemini ${model}: ${err.message.slice(0, 60)}`);
            }
        }

        throw new Error('Không thể kết nối AI. Vui lòng kiểm tra mạng và thử lại.');
    };

    // Xử lý queue: đảm bảo tin nhắn được gửi tuần tự, không bị race condition
    const processQueue = async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        while (messageQueueRef.current.length > 0) {
            const { text, skipUserMsg } = messageQueueRef.current.shift();
            await doSendInternal(text, skipUserMsg);
        }

        isProcessingRef.current = false;
    };

    const doSendInternal = async (text, skipUserMsg = false) => {
        // Cancel request đang chạy nếu có
        if (activeControllerRef.current) {
            activeControllerRef.current.abort();
        }
        const reqId = `req_${Date.now()}_${Math.random()}`;
        activeRequestIdRef.current = reqId;

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
                    text: 'Đang tạo ảnh cho bạn...', createdAt: Date.now()
                }]);
                await new Promise(r => setTimeout(r, 300));
                if (activeRequestIdRef.current !== reqId) return; // bị cancel
                const imageUrl = buildImageUrl(text);
                setMessages(prev => [
                    ...prev.filter(m => m.id !== confirmId),
                    { id: `ai_img_${Date.now()}`, role: 'model', text: 'Đây là ảnh AI tôi tạo cho bạn!', imageUrl, createdAt: Date.now() }
                ]);
            } else {
                // Snapshot messages tại thời điểm gửi (tránh stale closure)
                let snapshotMsgs;
                setMessages(prev => { snapshotMsgs = prev; return prev; });
                await new Promise(r => setTimeout(r, 0)); // flush state
                const currentMessages = userMsg ? [...(snapshotMsgs || []), userMsg] : (snapshotMsgs || []);

                const aiText = await callChat(text, currentMessages);

                // Chỉ update nếu đây vẫn là request hợp lệ (không bị cancel)
                if (activeRequestIdRef.current !== reqId) {
                    console.log('[AI] Request cũ bị bỏ qua (đã có request mới)');
                    return;
                }
                setMessages(prev => [...prev, {
                    id: `ai_${Date.now()}`, role: 'model',
                    text: aiText, createdAt: Date.now()
                }]);
            }
        } catch (err) {
            if (err.name === 'AbortError' || activeRequestIdRef.current !== reqId) return;
            const { friendly, retryAfter } = parseApiError(err.message || '');
            setMessages(prev => [...prev, {
                id: `err_${Date.now()}`, role: 'model',
                text: friendly, isError: true, createdAt: Date.now()
            }]);
            if (retryAfter) setPendingRetry({ text, seconds: retryAfter });
        } finally {
            if (activeRequestIdRef.current === reqId) {
                setLoading(false);
                setLoadingType('');
                activeControllerRef.current = null;
            }
        }
    };

    const doSend = (text, skipUserMsg = false) => {
        messageQueueRef.current.push({ text, skipUserMsg });
        processQueue();
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        Keyboard.dismiss();
        doSend(text);
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
                    <View style={styles.userBubbleWrap}>
                        <LinearGradient
                            colors={['#0084FF', '#0062cc']}
                            style={styles.userBubble}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.userText}>{item.text}</Text>
                        </LinearGradient>
                        <Text style={styles.timeR}>{fmt(item.createdAt)}</Text>
                    </View>
                </View>
            );
        }
        // AI bubble
        return (
            <View style={[styles.msgRow, { justifyContent: 'flex-start' }]}>
                <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                </LinearGradient>
                <View style={styles.aiBubbleWrap}>
                    <View style={[styles.aiBubble, item.isError && styles.errBubble]}>
                        {item.imageUrl ? (
                            <>
                                <ImageWithFallback uri={item.imageUrl} onPress={handleOpenImage} />
                                <Text style={[styles.aiText, { marginTop: 8, color: '#c4b5fd' }]}>{item.text}</Text>
                            </>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                {item.isError && (
                                    <Ionicons name="alert-circle" size={16} color="#f87171" style={{ marginTop: 3, flexShrink: 0 }} />
                                )}
                                <Text style={[styles.aiText, item.isError && { color: '#f87171' }]}>
                                    {item.text}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.timeL}>{fmt(item.createdAt)}</Text>
                </View>
            </View>
        );
    };

    const queueLen = messageQueueRef.current.length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.headerWrap} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#e4e4f4" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginHorizontal: 10 }}>
                        <View>
                            <LinearGradient colors={['#7c3aed', '#a78bfa']} style={styles.headerAvatar}>
                                <Ionicons name="sparkles" size={19} color="#fff" />
                            </LinearGradient>
                            {/* Online dot */}
                            <View style={styles.onlineDot} />
                        </View>
                        <View>
                            <Text style={styles.headerName}>Messta AI</Text>
                            <Text style={styles.headerSub}>
                                {loading
                                    ? (loadingType === 'image' ? '🎨 Đang vẽ ảnh...' : '💬 Đang trả lời...')
                                    : '✨ Luôn sẵn sàng'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={clearHistory} style={styles.headerBtn}>
                        <Ionicons name="refresh-outline" size={22} color="#a78bfa" />
                    </TouchableOpacity>
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
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={12}
                    windowSize={8}
                    ListFooterComponent={
                        loading ? (
                            loadingType === 'image' ? (
                                <View style={styles.imgLoadWrap}>
                                    <LinearGradient colors={['#7c3aed', '#a78bfa']} style={styles.imgLoadBox}>
                                        <Ionicons name="color-palette-outline" size={20} color="#fff" />
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
                    {/* Gợi ý nhanh - chỉ hiện khi mới vào */}
                    {messages.length <= 1 && (
                        <View style={styles.suggestRow}>
                            {[
                                { emoji: '🐱', label: 'Vẽ mèo cute' },
                                { emoji: '🌅', label: 'Vẽ hoàng hôn đẹp' },
                                { emoji: '🤖', label: 'AI là gì?' },
                                { emoji: '✍️', label: 'Viết thơ tình' },
                            ].map(s => (
                                <TouchableOpacity
                                    key={s.label}
                                    style={styles.suggest}
                                    onPress={() => setInput(s.label)}
                                >
                                    <Text style={styles.suggestEmoji}>{s.emoji}</Text>
                                    <Text style={styles.suggestText}>{s.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Hỏi hoặc 'Vẽ...' để tạo ảnh AI"
                            placeholderTextColor="#4a4a6a"
                            value={input}
                            onChangeText={setInput}
                            onSubmitEditing={handleSend}
                            multiline
                            maxLength={2000}
                            returnKeyType="send"
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!input.trim()}
                            activeOpacity={0.75}
                            style={[styles.sendBtn, !input.trim() && { opacity: 0.35 }]}
                        >
                            <LinearGradient
                                colors={input.trim() ? ['#7c3aed', '#a78bfa'] : ['#2a2a4a', '#2a2a4a']}
                                style={styles.sendBtnInner}
                            >
                                <Ionicons name="send" size={17} color="#fff" style={{ marginLeft: 2 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    {input.length > 1500 && (
                        <Text style={styles.charCount}>{input.length}/2000</Text>
                    )}
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
    // Header
    headerWrap: { backgroundColor: '#0d0d1a', borderBottomWidth: 1, borderBottomColor: '#1e1e35' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    headerAvatar: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#0d0d1a' },
    headerName: { color: '#f0f0ff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    headerSub: { color: '#a78bfa', fontSize: 11, marginTop: 1 },
    // List
    list: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 4 },
    msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
    // AI Avatar
    aiAvatar: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' },
    // User message
    userBubbleWrap: { alignItems: 'flex-end', maxWidth: '80%' },
    userBubble: { borderRadius: 20, borderBottomRightRadius: 5, paddingHorizontal: 14, paddingVertical: 10 },
    userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    timeR: { color: 'rgba(200,200,255,0.45)', fontSize: 10, marginTop: 3 },
    // AI message
    aiBubbleWrap: { maxWidth: '80%' },
    aiBubble: { backgroundColor: '#16162a', borderRadius: 20, borderBottomLeftRadius: 5, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2a2a4a' },
    aiText: { color: '#dde0ff', fontSize: 15, lineHeight: 23 },
    errBubble: { borderColor: '#5a1a1a', backgroundColor: '#150808' },
    timeL: { color: '#4a4a6a', fontSize: 10, marginTop: 3 },
    // Images
    generatedImg: { width: 230, height: 230, borderRadius: 16 },
    imgContainer: { width: 230, height: 230, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0d0d1a' },
    imgLoaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16162a', borderRadius: 16 },
    // Typing / loading
    typingRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
    typingBubble: { backgroundColor: '#16162a', borderRadius: 20, borderBottomLeftRadius: 5, padding: 14, borderWidth: 1, borderColor: '#2a2a4a' },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#a78bfa' },
    imgLoadWrap: { flexDirection: 'row', marginBottom: 14, paddingLeft: 38 },
    imgLoadBox: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', gap: 10 },
    imgLoadText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    retryBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingLeft: 38 },
    retryText: { color: '#a78bfa', fontSize: 13, fontStyle: 'italic' },
    // Input area
    inputWrap: { backgroundColor: '#0a0a18', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e1e35' },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
    suggest: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16162a', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: '#2e2e50' },
    suggestEmoji: { fontSize: 14 },
    suggestText: { color: '#c4b5fd', fontSize: 12, fontWeight: '500' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#16162a', borderRadius: 26, paddingHorizontal: 16, paddingVertical: 5, borderWidth: 1, borderColor: '#2e2e50' },
    input: { flex: 1, color: '#e4e4f4', fontSize: 15, maxHeight: 110, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, paddingRight: 8 },
    sendBtn: { marginBottom: 3 },
    sendBtnInner: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    charCount: { color: '#4a4a6a', fontSize: 11, textAlign: 'right', marginTop: 4, marginRight: 4 },


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
