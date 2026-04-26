import { db } from '../config/firebaseConfig';
import { ref, push, get, update, onValue } from 'firebase/database';
import { uploadImageToCloudinary } from './cloudinaryService';
import { sendPushNotification } from './notificationService';

export const getChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const sendMessage = async (chatId, text, imageUris, senderId, newsReply = null) => {
    try {

        let images = [];
        if (imageUris) {
            const uriArray = Array.isArray(imageUris) ? imageUris : [imageUris];
            if (uriArray.length > 0) {
                images = await Promise.all(
                    uriArray.map(uri => uploadImageToCloudinary(uri, 'chat'))
                );
            }
        }

        const hasImages = images.length > 0;
        const hasText = text && text.trim().length > 0;

        const messageData = {
            senderId,
            text: hasText ? text.trim() : '',
            images: hasImages ? images : null,
            newsReply: newsReply ? newsReply : null,
            createdAt: Date.now(),
        };

        await push(ref(db, `messages/${chatId}`), messageData);

        const uids = chatId.split('_');
        const lastMessage = hasText
            ? text.trim()
            : `Đã gửi ${images.length} ảnh`;

        await update(ref(db, `chats/${chatId}`), {
            lastMessage,
            lastSenderId: senderId,
            isRead: false,
            updatedAt: Date.now(),
            members: { [uids[0]]: true, [uids[1]]: true },
        });

        const recipientId = uids.find(id => id !== senderId);
        if (recipientId) {
            const recipientSnap = await get(ref(db, `users/${recipientId}`));
            if (recipientSnap.exists()) {
                const recipientData = recipientSnap.val();
                if (recipientData.pushToken) {
                    const senderSnap = await get(ref(db, `users/${senderId}`));
                    const senderName = senderSnap.exists() ? senderSnap.val().fullName : 'Tin nhắn mới';
                    await sendPushNotification(recipientData.pushToken, senderName, lastMessage, { chatId });
                }
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

export const markMessagesAsRead = async (chatId) => {
    try {
        await update(ref(db, `chats/${chatId}`), { isRead: true });
    } catch (error) {
        console.error('Error marking as read:', error);
    }
};

export const subscribeToMessages = (chatId, callback) => {
    const messagesRef = ref(db, `messages/${chatId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messages = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                messages.push({ id: child.key, ...child.val() });
            });
            messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        callback(messages);
    });
    return unsubscribe;
};
