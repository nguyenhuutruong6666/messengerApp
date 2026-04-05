import { db } from '../config/firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, or, and, orderBy } from 'firebase/firestore';

export const sendFriendRequest = async (fromUserId, toUserId) => {
    try {
        const q = query(
            collection(db, 'friend_requests'),
            or(
                and(where('fromUserId', '==', fromUserId), where('toUserId', '==', toUserId)),
                and(where('fromUserId', '==', toUserId), where('toUserId', '==', fromUserId))
            )
        );
        const existing = await getDocs(q);

        if (!existing.empty) {
            const existingDoc = existing.docs[0];
            const data = existingDoc.data();

            if (data.status === 'rejected') {
                const docRef = doc(db, 'friend_requests', existingDoc.id);

                await updateDoc(docRef, {
                    status: 'pending',
                    fromUserId: fromUserId,
                    toUserId: toUserId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                return true;
            } else if (data.status === 'pending') {
                throw new Error("Đang chờ xác nhận.");
            } else if (data.status === 'accepted') {
                throw new Error("Đã là bạn bè.");
            }
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

export const checkFriendRelationship = async (currentUserId, targetUserId) => {
    try {
        const q = query(
            collection(db, 'friend_requests'),
            or(
                and(where('fromUserId', '==', currentUserId), where('toUserId', '==', targetUserId)),
                and(where('fromUserId', '==', targetUserId), where('toUserId', '==', currentUserId))
            )
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const data = snapshot.docs[0].data();

        return {
            id: snapshot.docs[0].id,
            ...data
        };
    } catch (error) {
        console.error("Error checking relationship:", error);
        return null;
    }
}

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

export const getMyAcceptedRequests = async (userId) => {
    try {
        const q = query(
            collection(db, 'friend_requests'),
            where('fromUserId', '==', userId),
            where('status', '==', 'accepted')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting accepted requests:", error);
        return [];
    }
};

export const acceptFriendRequest = async (requestId) => {
    try {
        const reqRef = doc(db, 'friend_requests', requestId);
        await updateDoc(reqRef, {
            status: 'accepted',
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Error accepting request:", error);
        throw error;
    }
};

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

export const getFriends = async (userId) => {
    try {
        const q1 = query(
            collection(db, 'friend_requests'),
            where('fromUserId', '==', userId),
            where('status', '==', 'accepted')
        );
        const q2 = query(
            collection(db, 'friend_requests'),
            where('toUserId', '==', userId),
            where('status', '==', 'accepted')
        );

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const friends = [];

        snap1.forEach(doc => {
            friends.push(doc.data().toUserId);
        });
        snap2.forEach(doc => {
            friends.push(doc.data().fromUserId);
        });

        return friends;
    } catch (error) {
        console.error("Error getting friends:", error);
        throw error;
    }
}
