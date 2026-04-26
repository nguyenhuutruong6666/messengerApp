import { db } from '../config/firebaseConfig';
import { ref, push, get, query, orderByChild, onValue } from 'firebase/database';
import { uploadImageToCloudinary } from './cloudinaryService';

export const postNews = async (imageUri, userId) => {
    try {
        const imageUrl = await uploadImageToCloudinary(imageUri, 'news');
        const newsData = {
            userId,
            imageUrl,
            createdAt: Date.now(),
        };
        await push(ref(db, 'news'), newsData);
        return true;
    } catch (error) {
        console.error('Error posting news:', error);
        throw error;
    }
};

export const subscribeToAllNews = (callback) => {
    const newsRef = query(ref(db, 'news'), orderByChild('createdAt'));
    const unsubscribe = onValue(newsRef, async (snapshot) => {
        const newsList = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                newsList.push({ id: child.key, ...child.val() });
            });

            newsList.sort((a, b) => b.createdAt - a.createdAt);

            for (let i = 0; i < newsList.length; i++) {
                const userSnap = await get(ref(db, `users/${newsList[i].userId}`));
                if (userSnap.exists()) {
                    newsList[i].userInfo = userSnap.val();
                }
            }
        }
        callback(newsList);
    });
    return unsubscribe;
};
