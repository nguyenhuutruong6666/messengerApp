import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    StyleSheet, Image, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, Modal, ScrollView,
    Dimensions, StatusBar, SafeAreaView, Keyboard
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getChatId, sendMessage, subscribeToMessages, markMessagesAsRead, deleteMessageImage } from '../services/chatService';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { db } from '../config/firebaseConfig';
import { ref, get } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IMG_SIZE = 180;

const ImageViewer = ({ visible, images, isMe, initialIndex, onClose, onDelete }) => {
    const [index, setIndex] = useState(initialIndex);
    const flatListRef = useRef();

    useEffect(() => {
        if (visible) {
            setIndex(initialIndex);
            // Use setTimeout to ensure FlatList has layout before scrolling
            setTimeout(() => {
                if (flatListRef.current && images?.length > initialIndex) {
                    flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
                }
            }, 100);
        }
    }, [visible, initialIndex, images]);

    const handleScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const currentIndex = Math.round(contentOffsetX / SCREEN_W);
        setIndex(currentIndex);
    };

    const downloadImage = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cấp quyền', 'Cần quyền truy cập thư viện ảnh để tải xuống');
                return;
            }
            const uri = images[index];
            const filename = `messenger_img_${Date.now()}.jpg`;
            const fileUri = FileSystem.documentDirectory + filename;
            
            const downloadedFile = await FileSystem.downloadAsync(uri, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
            Alert.alert('Thành công', 'Đã lưu ảnh vào thư viện thiết bị');
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải ảnh xuống');
        }
    };

    const handleDelete = () => {
        Alert.alert('Xóa ảnh', 'Bạn có chắc chắn muốn xóa ảnh này không?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: () => onDelete(index) }
        ]);
    };

    if (!visible || !images?.length) return null;

    return (
        <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
            <StatusBar hidden />
            <View style={viewer.container}>
                {/* Nút đóng */}
                <TouchableOpacity style={viewer.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>

                {/* FlatList để vuốt ảnh */}
                <FlatList
                    ref={flatListRef}
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    getItemLayout={(data, idx) => ({ length: SCREEN_W, offset: SCREEN_W * idx, index: idx })}
                    keyExtractor={(item, idx) => idx.toString()}
                    initialScrollIndex={initialIndex}
                    renderItem={({ item }) => (
                        <ScrollView
                            style={{ width: SCREEN_W, height: SCREEN_H }}
                            contentContainerStyle={viewer.scrollContent}
                            maximumZoomScale={4}
                            minimumZoomScale={1}
                            centerContent
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        >
                            <Image
                                source={{ uri: item }}
                                style={viewer.image}
                                resizeMode="contain"
                            />
                        </ScrollView>
                    )}
                />

                {/* Nút hành động */}
                <View style={viewer.bottomBar}>
                    {images.length > 1 ? (
                        <Text style={viewer.counter}>{index + 1} / {images.length}</Text>
                    ) : <View />}

                    <View style={viewer.actionButtons}>
                        <TouchableOpacity style={viewer.actionBtn} onPress={downloadImage}>
                            <Ionicons name="download-outline" size={26} color="#fff" />
                        </TouchableOpacity>
                        
                        {isMe && (
                            <TouchableOpacity style={viewer.actionBtn} onPress={handleDelete}>
                                <Ionicons name="trash-outline" size={26} color="#ff4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
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
    bottomBar: {
        position: 'absolute', bottom: 40, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 20,
    },
    counter: { color: '#fff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    actionButtons: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: {
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 10, marginLeft: 15,
    }
});

const NewsReplyPreview = ({ newsReply, isMe }) => {
    const [exists, setExists] = useState(true);

    useEffect(() => {
        const checkNews = async () => {
            const snap = await get(ref(db, `news/${newsReply.newsId}`));
            if (!snap.exists()) setExists(false);
        };
        checkNews();
    }, [newsReply.newsId]);

    if (!exists) {
        return (
            <View style={styles.deletedNewsContainer}>
                <Ionicons name="alert-circle" size={16} color={isMe ? 'rgba(255,255,255,0.8)' : '#b0b3b8'} />
                <Text style={[styles.deletedNewsText, isMe && { color: 'rgba(255,255,255,0.8)' }]}>Ảnh không tồn tại</Text>
            </View>
        );
    }

    return (
        <View style={styles.newsReplyPreview}>
            <Image source={{ uri: newsReply.imageUrl }} style={styles.newsReplyImg} />
            <View style={styles.newsReplyOverlay}>
                <Ionicons name="camera" size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.newsReplyLabel}>Đã trả lời tin</Text>
            </View>
        </View>
    );
};

const ChatDetailScreen = ({ route }) => {
    const { friend } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerData, setViewerData] = useState(null); // { message, images, isMe }
    const [viewerIndex, setViewerIndex] = useState(0);
    const flatListRef = useRef();
    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();
    const chatId = getChatId(user.uid, friend.id);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: friend.fullName,
            headerStyle: { backgroundColor: '#121212', shadowColor: 'transparent', elevation: 0 },
            headerTintColor: '#fff',
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Thông báo', 'Tính năng gọi đang phát triển')}
                        style={{ marginRight: 20 }}
                    >
                        <Ionicons name="call" size={24} color="#0084FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Thông báo', 'Tính năng gọi video đang phát triển')}
                    >
                        <Ionicons name="videocam" size={24} color="#0084FF" />
                    </TouchableOpacity>
                </View>
            ),
        });

        const unsubscribe = subscribeToMessages(chatId, (msgs) => {
            setMessages(msgs);
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

    const openViewer = (messageItem, imageList, idx = 0) => {
        setViewerData({ message: messageItem, images: imageList, isMe: messageItem.senderId === user.uid });
        setViewerIndex(idx);
        setViewerVisible(true);
    };

    const handleDeleteImage = async (imgIndex) => {
        if (!viewerData || !viewerData.message) return;
        try {
            await deleteMessageImage(chatId, viewerData.message.id, imgIndex, viewerData.message);
            setViewerVisible(false);
        } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa ảnh');
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === user.uid;

        const imageList = item.images || (item.imageUrl ? [item.imageUrl] : []);
        const cols = imageList.length === 1 ? 1 : 2;
        const imgW = imageList.length === 1 ? IMG_SIZE * 1.2 : IMG_SIZE * 0.62;

        const BubbleComponent = isMe ? LinearGradient : View;
        const bubbleProps = isMe ? { colors: ['#0084FF', '#00C6FF'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : {};

        const formatFullTime = (timestamp) => {
            if (!timestamp) return '';
            const d = new Date(timestamp);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };

        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && <UserAvatar uri={friend.avatar} size={30} style={styles.avatar} />}
                <BubbleComponent 
                    {...bubbleProps}
                    style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble,
                    imageList.length > 0 && !item.text && styles.bubbleImageOnly]}>

                    {/* Lưới ảnh */}
                    {imageList.length > 0 && (
                        <View style={[styles.imageGrid, { flexDirection: 'row', flexWrap: 'wrap', gap: 3 }]}>
                            {imageList.map((url, idx) => (
                                <TouchableOpacity key={idx} onPress={() => openViewer(item, imageList, idx)} activeOpacity={0.85}>
                                    <Image
                                        source={{ uri: url }}
                                        style={{ width: imgW, height: imgW, borderRadius: 8 }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* News Reply Preview */}
                    {item.newsReply && (
                        <NewsReplyPreview newsReply={item.newsReply} isMe={isMe} />
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
                            {formatFullTime(item.createdAt)}
                        </Text>
                    )}
                </BubbleComponent>
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
                    data={[...messages].reverse()}
                    inverted
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
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
                <View style={[styles.inputContainerWrapper, { paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 10 : 8) : (Platform.OS === 'ios' ? 24 : 12) }]}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={pickImages} style={styles.iconButton}>
                            <Ionicons name="image" size={26} color="#0084FF" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Aa"
                            placeholderTextColor="#A0A3A8"
                            value={text}
                            onChangeText={setText}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={sending || (!text.trim() && images.length === 0)}
                            activeOpacity={0.7}
                            style={styles.sendButtonWrapper}
                        >
                            {(!text.trim() && images.length === 0) ? (
                                <View style={[styles.sendButton, styles.sendDisabled]}>
                                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#A0A3A8" style={{ marginLeft: 3 }} />}
                                </View>
                            ) : (
                                <LinearGradient
                                    colors={['#0084FF', '#00C6FF']}
                                    style={styles.sendButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />}
                                </LinearGradient>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Full screen image viewer */}
            <ImageViewer
                visible={viewerVisible}
                images={viewerData?.images}
                isMe={viewerData?.isMe}
                initialIndex={viewerIndex}
                onClose={() => setViewerVisible(false)}
                onDelete={handleDeleteImage}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    listContent: { padding: 12, paddingBottom: 24 },

    messageContainer: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
    myMessage: { justifyContent: 'flex-end' },
    theirMessage: { justifyContent: 'flex-start' },

    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },

    bubble: { maxWidth: '75%', padding: 10, borderRadius: 18 },
    myBubble: { borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#1E1E1E', borderBottomLeftRadius: 4 },
    bubbleImageOnly: { padding: 4, backgroundColor: 'transparent' },

    imageGrid: { borderRadius: 14, overflow: 'hidden' },

    messageText: { fontSize: 16, lineHeight: 22 },
    myText: { color: '#FFFFFF', fontWeight: '400' },
    theirText: { color: '#E4E6EB', fontWeight: '400' },

    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#8A8D91' },

    previewBar: {
        backgroundColor: '#121212',
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 120,
    },
    previewItem: { position: 'relative', marginRight: 12 },
    previewImg: { width: 90, height: 90, borderRadius: 16 },
    removeBtn: {
        position: 'absolute', top: -6, right: -6,
        backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12,
    },

    inputContainerWrapper: {
        backgroundColor: '#121212',
        paddingHorizontal: 10,
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopWidth: 1,
        borderTopColor: '#1E1E1E',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'transparent',
        padding: 0,
    },
    iconButton: { 
        height: 40, 
        width: 40, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 0 
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        color: '#E4E6EB',
        fontSize: 16,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        marginHorizontal: 8,
    },
    sendButtonWrapper: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendDisabled: { backgroundColor: 'transparent' },
    deletedNewsContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8, marginBottom: 4,
    },
    deletedNewsText: {
        color: '#b0b3b8', fontSize: 12, marginLeft: 4, fontStyle: 'italic',
    },
    newsReplyPreview: {
        marginBottom: 4, borderRadius: 14, overflow: 'hidden',
        position: 'relative', width: IMG_SIZE * 0.7, height: IMG_SIZE * 0.7,
    },
    newsReplyImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    newsReplyOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', padding: 6,
    },
    newsReplyLabel: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});

export default ChatDetailScreen;
