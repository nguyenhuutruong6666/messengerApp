import { db } from '../config/firebaseConfig';
import { ref, push, get, query, orderByChild, onValue, remove } from 'firebase/database';
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

export const deleteNews = async (newsId) => {
    try {
        await remove(ref(db, `news/${newsId}`));
        return true;
    } catch (error) {
        console.error('Error deleting news:', error);
        throw error;
    }
};

export const subscribeToAllNews = (callback) => {
    const newsRef = query(ref(db, 'news'), orderByChild('createdAt'));
    const usersRef = ref(db, 'users');

    let currentNewsList = [];
    let currentUsersMap = {};

    const updateCallback = () => {
        const enrichedNews = currentNewsList.map(news => ({
            ...news,
            userInfo: currentUsersMap[news.userId] || null
        }));
        callback(enrichedNews);
    };

    const unsubscribeNews = onValue(newsRef, (snapshot) => {
        const newsList = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                newsList.push({ id: child.key, ...child.val() });
            });
            newsList.sort((a, b) => b.createdAt - a.createdAt);
        }
        currentNewsList = newsList;
        updateCallback();
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            currentUsersMap = snapshot.val();
        } else {
            currentUsersMap = {};
        }
        updateCallback();
    });

    return () => {
        unsubscribeNews();
        unsubscribeUsers();
    };
};
