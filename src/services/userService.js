import { db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export const searchUserByPhone = async (phone) => {
    try {
        const q = query(collection(db, 'users'), where('phone', '==', phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        // Attempt to return the first match (phone should be unique)
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
        console.error("Error searching user:", error);
        throw error;
    }
};

export const getUserById = async (userId) => {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting user:", error);
        throw error;
    }
};
