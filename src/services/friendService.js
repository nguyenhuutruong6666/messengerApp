import { db } from '../config/firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, or, and } from 'firebase/firestore';

// Send a friend request
export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        // Check if request already exists
        const q = query(
            collection(db, 'friend_requests'),
            or(
                and(where('fromUserId', '==', fromUserId), where('toUserId', '==', toUserId)),
                and(where('fromUserId', '==', toUserId), where('toUserId', '==', fromUserId))
            )
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error("Request already exists or you are already friends.");
        }

        await addDoc(collection(db, 'friend_requests'), {
            fromUserId,
            toUserId,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
};

// Get pending requests for a user
export const getPendingRequests = async (userId) => {
    try {
        const q = query(
            collection(db, 'friend_requests'),
            where('toUserId', '==', userId),
            where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting pending requests:", error);
        throw error;
    }
};

// Accept friend request
export const acceptFriendRequest = async (requestId) => {
    try {
        const reqRef = doc(db, 'friend_requests', requestId);
        await updateDoc(reqRef, {
            status: 'accepted',
            updatedAt: serverTimestamp(),
        });
        // In a real app, you might trigger a Cloud Function to create 'friend' records for both users
        // or create a 'chat' room immediately.
        // For this app, we will rely on querying accepted requests to list friends.
        return true;
    } catch (error) {
        console.error("Error accepting request:", error);
        throw error;
    }
};

// Reject friend request
export const rejectFriendRequest = async (requestId) => {
    try {
        const reqRef = doc(db, 'friend_requests', requestId);
        await updateDoc(reqRef, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Error rejecting request:", error);
        throw error;
    }
};

// Get List of Friends (Accepted requests)
// This is a bit complex with just one collection query if we are participant A or B.
// We'll filter in memory or do two queries.
export const getFriends = async (userId) => {
    try {
        // I sent and they accepted
        const q1 = query(
            collection(db, 'friend_requests'),
            where('fromUserId', '==', userId),
            where('status', '==', 'accepted')
        );
        // They sent and I accepted
        const q2 = query(
            collection(db, 'friend_requests'),
            where('toUserId', '==', userId),
            where('status', '==', 'accepted')
        );

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const friends = [];

        snap1.forEach(doc => {
            friends.push(doc.data().toUserId); // The other person is 'to'
        });
        snap2.forEach(doc => {
            friends.push(doc.data().fromUserId); // The other person is 'from'
        });

        return friends; // Returns array of userIDs
    } catch (error) {
        console.error("Error getting friends:", error);
        throw error;
    }
}
