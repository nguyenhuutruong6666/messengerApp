import { db, storage } from '../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendPushNotification } from './notificationService';

export const getChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const sendMessage = async (chatId, text, imageUri, senderId) => {
    try {
        let imageUrl = null;
        if (imageUri) {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const filename = `images/${chatId}/${Date.now()}`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            imageUrl = await getDownloadURL(storageRef);
        }
        const messageData = {
            senderId,
            text: text || '',
            imageUrl: imageUrl || null,
            createdAt: serverTimestamp(),
        };

        const messagesRef = collection(db, 'messages', chatId, 'chat_messages');
        await addDoc(messagesRef, messageData);

        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            lastMessage: text || (imageUrl ? 'Image sent' : ''),
            lastSenderId: senderId,
            isRead: false,
            updatedAt: serverTimestamp(),
            members: chatId.split('_')
        }, { merge: true });

        const uids = chatId.split('_');
        const recipientId = uids.find(id => id !== senderId);

        if (recipientId) {
            const recipientDoc = await getDoc(doc(db, 'users', recipientId));
            if (recipientDoc.exists()) {
                const recipientData = recipientDoc.data();
                if (recipientData.pushToken) {
                    const senderDoc = await getDoc(doc(db, 'users', senderId));
                    const senderName = senderDoc.exists() ? senderDoc.data().fullName : 'Tin nhắn mới';
                    const msgBody = text || (imageUrl ? 'Đã gửi một ảnh' : 'Tin nhắn mới');

                    await sendPushNotification(recipientData.pushToken, senderName, msgBody, { chatId });
                }
            }
        }

    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

export const markMessagesAsRead = async (chatId) => {
    try {
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            isRead: true
        }, { merge: true });
    } catch (error) {
        console.error("Error marking as read:", error);
    }
};

export const subscribeToMessages = (chatId, callback) => {
    const q = query(
        collection(db, 'messages', chatId, 'chat_messages'),
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(messages);
    });

    return unsubscribe;
};
