import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getChatId, sendMessage, subscribeToMessages, markMessagesAsRead } from '../services/chatService';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import UserAvatar from '../components/UserAvatar';

import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';

const ChatDetailScreen = ({ route }) => {
    const { friend } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [image, setImage] = useState(null);
    const [sending, setSending] = useState(false);
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
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        markMessagesAsRead(chatId);

        return () => unsubscribe();
    }, [chatId]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if (!text && !image) return;
        setSending(true);
        try {
            await sendMessage(chatId, text, image, user.uid);
            setText('');
            setImage(null);
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === user.uid;
        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
                {!isMe && <UserAvatar uri={friend.avatar} size={30} style={styles.avatar} />}
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {item.imageUrl && (
                        <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                    )}
                    {item.text ? <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>{item.text}</Text> : null}
                    {item.createdAt && (
                        <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
                            {new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 100}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {image && (
                <View style={styles.imagePreview}>
                    <Image source={{ uri: image }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                    <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImage}>
                        <Text style={{ color: 'white' }}>X</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.iconButton}>
                    <Text style={styles.iconText}>📷</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#aaa"
                    value={text}
                    onChangeText={setText}
                    multiline={true}
                />
                <TouchableOpacity onPress={handleSend} disabled={sending} style={styles.sendButton}>
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>Gửi</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#18191a', // Dark background
    },
    listContent: {
        padding: 10,
        paddingBottom: 20,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'flex-end',
    },
    myMessage: {
        justifyContent: 'flex-end',
    },
    theirMessage: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    bubble: {
        maxWidth: '70%',
        padding: 10,
        borderRadius: 15,
    },
    myBubble: {
        backgroundColor: '#0084ff',
        borderBottomRightRadius: 2,
    },
    theirBubble: {
        backgroundColor: '#3e4042', // Darker gray for others
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 16,
    },
    myText: {
        color: '#fff',
    },
    theirText: {
        color: '#e4e6eb',
    },
    messageImage: {
        width: 150,
        height: 150,
        borderRadius: 10,
        marginBottom: 5,
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTime: {
        color: '#b0b3b8',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#3e4042',
        alignItems: 'center',
        backgroundColor: '#242526', // Dark Input Bar
    },
    iconButton: {
        padding: 10,
    },
    iconText: {
        fontSize: 20,
    },
    input: {
        flex: 1,
        backgroundColor: '#3a3b3c', // Dark Input Field
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginHorizontal: 10,
        maxHeight: 100,
        color: '#e4e6eb',
    },
    sendButton: {
        backgroundColor: '#0084ff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    sendText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    imagePreview: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18191a',
    },
    removeImage: {
        marginLeft: 10,
        backgroundColor: 'red',
        padding: 5,
        borderRadius: 10,
    }
});

export default ChatDetailScreen;
