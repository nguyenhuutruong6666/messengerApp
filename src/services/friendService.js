import { db } from '../config/firebaseConfig';
import { ref, push, get, update, query, orderByChild, equalTo } from 'firebase/database';

export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        const existing = await checkFriendRelationship(fromUserId, toUserId);

        if (existing) {
            if (existing.status === 'pending') throw new Error('Đang chờ xác nhận.');
            if (existing.status === 'accepted') throw new Error('Đã là bạn bè.');
            if (existing.status === 'rejected') {
                await update(ref(db, `friend_requests/${existing.id}`), {
                    status: 'pending',
                    fromUserId,
                    toUserId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                });
                return true;
            }
        }

        await push(ref(db, 'friend_requests'), {
            fromUserId,
            toUserId,
            status: 'pending',
            createdAt: Date.now(),
        });
        return true;
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
};

export const checkFriendRelationship = async (currentUserId, targetUserId) => {
    try {
        const snapshot = await get(ref(db, 'friend_requests'));
        if (!snapshot.exists()) return null;

        let result = null;
        snapshot.forEach(child => {
            const data = child.val();
            if (
                (data.fromUserId === currentUserId && data.toUserId === targetUserId) ||
                (data.fromUserId === targetUserId && data.toUserId === currentUserId)
            ) {
                result = { id: child.key, ...data };
            }
        });
        return result;
    } catch (error) {
        console.error('Error checking relationship:', error);
        return null;
    }
};

export const getPendingRequests = async (userId) => {
    try {
        const q = query(ref(db, 'friend_requests'), orderByChild('toUserId'), equalTo(userId));
        const snapshot = await get(q);
        const results = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const data = child.val();
                if (data.status === 'pending') {
                    results.push({ id: child.key, ...data });
                }
            });
        }
        return results;
    } catch (error) {
        console.error('Error getting pending requests:', error);
        throw error;
    }
};

export const getMyAcceptedRequests = async (userId) => {
    try {
        const q = query(ref(db, 'friend_requests'), orderByChild('fromUserId'), equalTo(userId));
        const snapshot = await get(q);
        const results = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const data = child.val();
                if (data.status === 'accepted') {
                    results.push({ id: child.key, ...data });
                }
            });
        }
        return results;
    } catch (error) {
        console.error('Error getting accepted requests:', error);
        return [];
    }
};

export const acceptFriendRequest = async (requestId) => {
    try {
        await update(ref(db, `friend_requests/${requestId}`), {
            status: 'accepted',
            updatedAt: Date.now(),
        });
        return true;
    } catch (error) {
        console.error('Error accepting request:', error);
        throw error;
    }
};

export const rejectFriendRequest = async (requestId) => {
    try {
        await update(ref(db, `friend_requests/${requestId}`), {
            status: 'rejected',
            updatedAt: Date.now(),
        });
        return true;
    } catch (error) {
        console.error('Error rejecting request:', error);
        throw error;
    }
};

export const getFriends = async (userId) => {
    try {
        const snapshot = await get(ref(db, 'friend_requests'));
        if (!snapshot.exists()) return [];

        const friends = [];
        snapshot.forEach(child => {
            const data = child.val();
            if (data.status === 'accepted') {
                if (data.fromUserId === userId) friends.push(data.toUserId);
                else if (data.toUserId === userId) friends.push(data.fromUserId);
            }
        });
        return friends;
    } catch (error) {
        console.error('Error getting friends:', error);
        throw error;
    }
};
