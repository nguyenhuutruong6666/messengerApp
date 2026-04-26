import { db } from '../config/firebaseConfig';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';

const isOfflineError = (error) =>
    error?.code === 'unavailable' ||
    error?.message?.includes('offline');

export const searchUserByPhone = async (phone) => {
    try {
        const q = query(ref(db, 'users'), orderByChild('phone'), equalTo(phone));
        const snapshot = await get(q);
        if (!snapshot.exists()) return null;

        let result = null;
        snapshot.forEach(child => {
            result = { id: child.key, ...child.val() };
        });
        return result;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn('RTDB offline — searchUserByPhone bỏ qua');
            return null;
        }
        console.error('Error searching user:', error);
        throw error;
    }
};

export const getUserById = async (userId) => {
    try {
        const snapshot = await get(ref(db, `users/${userId}`));
        if (snapshot.exists()) {
            return { id: snapshot.key, ...snapshot.val() };
        }
        return null;
    } catch (error) {
        if (isOfflineError(error)) {
            console.warn('RTDB offline — getUserById bỏ qua:', userId);
            return null;
        }
        console.error('Error getting user:', error);
        return null;
    }
};
