import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    StyleSheet, Image, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, Modal, ScrollView,
    Dimensions, StatusBar, SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getChatId, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMG_SIZE = 180;

const ImageViewer = ({ visible, images, initialIndex, onClose }) => {
    const [index, setIndex] = useState(initialIndex);

    useEffect(() => {
        if (visible) setIndex(initialIndex);
    }, [visible, initialIndex]);

    if (!visible || !images?.length) return null;

    return (
        <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
            <StatusBar hidden />
            <View style={viewer.container}>
                {/* Nút đóng */}
                <TouchableOpacity style={viewer.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>

                {/* Ảnh với zoom */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={viewer.scrollContent}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    centerContent
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <Image
                        source={{ uri: images[index] }}
                        style={viewer.image}
                        resizeMode="contain"
                    />
                </ScrollView>

                {/* Điều hướng nếu nhiều ảnh */}
                {images.length > 1 && (
                    <View style={viewer.nav}>
                        <TouchableOpacity
                            onPress={() => setIndex(i => Math.max(0, i - 1))}
                            disabled={index === 0}
                            style={viewer.navBtn}
                        >
                            <Ionicons name="chevron-back" size={32} color={index === 0 ? '#555' : '#fff'} />
                        </TouchableOpacity>
                        <Text style={viewer.counter}>{index + 1} / {images.length}</Text>
                        <TouchableOpacity
                            onPress={() => setIndex(i => Math.min(images.length - 1, i + 1))}
                            disabled={index === images.length - 1}
                            style={viewer.navBtn}
                        >
                            <Ionicons name="chevron-forward" size={32} color={index === images.length - 1 ? '#555' : '#fff'} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const viewer = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    closeBtn: {
        position: 'absolute', top: 50, right: 20, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4,
    },
    scrollContent: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
    },
    image: { width: SCREEN_W, height: SCREEN_H * 0.78 },
    nav: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    navBtn: { padding: 10 },
    counter: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const ChatDetailScreen = ({ route }) => {
    const { friend } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImages, setViewerImages] = useState([]);
    const [viewerIndex, setViewerIndex] = useState(0);
    const flatListRef = useRef();
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();
    const chatId = getChatId(user.uid, friend.id);

    useEffect(() => {
        navigation.setOptions({
            title: friend.fullName,
            headerStyle: { backgroundColor: '#18191a' },
            headerTintColor: '#fff',
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Thông báo', 'Tính năng gọi đang phát triển')}
                        style={{ marginRight: 20 }}
                    >
                        <Ionicons name="call" size={24} color="#0084ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Thông báo', 'Tính năng gọi video đang phát triển')}
                    >
                        <Ionicons name="videocam" size={24} color="#0084ff" />
                    </TouchableOpacity>
                </View>
            ),
        });

        const unsubscribe = subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });
        markMessagesAsRead(chatId);
        return () => unsubscribe();
    }, [chatId]);

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,  
            quality: 0.85,                  
        });
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
    };

    const removePreviewImage = (uri) => {
        setImages(prev => prev.filter(u => u !== uri));
    };

    const handleSend = async () => {
        if (!text.trim() && images.length === 0) return;
        setSending(true);
        try {
            await sendMessage(chatId, text, images, user.uid);
            setText('');
            setImages([]);
        } catch (error) {
            console.error('Send error:', error);
            Alert.alert('Lỗi gửi tin nhắn', error?.message || 'Đã xảy ra lỗi, thử lại nhé.');
        } finally {
            setSending(false);
        }
    };

    const openViewer = (imageList, idx = 0) => {
        setViewerImages(imageList);
        setViewerIndex(idx);
        setViewerVisible(true);
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === user.uid;

        const imageList = item.images || (item.imageUrl ? [item.imageUrl] : []);
        const cols = imageList.length === 1 ? 1 : 2;
        const imgW = imageList.length === 1 ? IMG_SIZE * 1.2 : IMG_SIZE * 0.62;

        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && <UserAvatar uri={friend.avatar} size={30} style={styles.avatar} />}
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble,
                    imageList.length > 0 && !item.text && styles.bubbleImageOnly]}>

                    {/* Lưới ảnh */}
                    {imageList.length > 0 && (
                        <View style={[styles.imageGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: 3 }]}>
                            {imageList.map((url, idx) => (
                                <TouchableOpacity key={idx} onPress={() => openViewer(imageList, idx)} activeOpacity={0.85}>
                                    <Image
                                        source={{ uri: url }}
                                        style={{ width: imgW, height: imgW, borderRadius: 8 }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Text */}
                    {!!item.text && (
                        <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                            {item.text}
                        </Text>
                    )}

                    {/* Thời gian */}
                    {item.createdAt && (
                        <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 100}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {/* Preview ảnh đang chờ gửi */}
                {images.length > 0 && (
                    <ScrollView horizontal style={styles.previewBar} showsHorizontalScrollIndicator={false}>
                        {images.map((uri, idx) => (
                            <View key={idx} style={styles.previewItem}>
                                <Image source={{ uri }} style={styles.previewImg} resizeMode="cover" />
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => removePreviewImage(uri)}
                                >
                                    <Ionicons name="close-circle" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Input bar */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={pickImages} style={styles.iconButton}>
                        <Ionicons name="image-outline" size={26} color="#0084ff" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập tin nhắn..."
                        placeholderTextColor="#aaa"
                        value={text}
                        onChangeText={setText}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending || (!text.trim() && images.length === 0)}
                        style={[styles.sendButton, (sending || (!text.trim() && images.length === 0)) && styles.sendDisabled]}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="send" size={20} color="#fff" />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Full screen image viewer */}
            <ImageViewer
                visible={viewerVisible}
                images={viewerImages}
                initialIndex={viewerIndex}
                onClose={() => setViewerVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#18191a' },
    listContent: { padding: 10, paddingBottom: 20 },

    messageContainer: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
    myMessage: { justifyContent: 'flex-end' },
    theirMessage: { justifyContent: 'flex-start' },

    avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },

    bubble: { maxWidth: '75%', padding: 10, borderRadius: 18 },
    myBubble: { backgroundColor: '#0084ff', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#3e4042', borderBottomLeftRadius: 4 },
    bubbleImageOnly: { padding: 4 },

    imageGrid: { borderRadius: 10, overflow: 'hidden' },

    messageText: { fontSize: 16 },
    myText: { color: '#fff' },
    theirText: { color: '#e4e6eb' },

    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#b0b3b8' },

    previewBar: {
        backgroundColor: '#242526',
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxHeight: 120,
    },
    previewItem: { position: 'relative', marginRight: 8 },
    previewImg: { width: 90, height: 90, borderRadius: 10 },
    removeBtn: {
        position: 'absolute', top: -6, right: -6,
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    },

    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#3e4042',
        alignItems: 'center',
        backgroundColor: '#242526',
    },
    iconButton: { padding: 8 },
    input: {
        flex: 1,
        backgroundColor: '#3a3b3c',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginHorizontal: 8,
        maxHeight: 100,
        color: '#e4e6eb',
    },
    sendButton: {
        backgroundColor: '#0084ff',
        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: 42,
        height: 42,
    },
    sendDisabled: { backgroundColor: '#3a3b3c' },
});

export default ChatDetailScreen;
