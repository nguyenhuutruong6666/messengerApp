import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null); // Firestore user data
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (usr) => {
            setUser(usr);
            if (usr) {
                import('firebase/firestore').then(({ onSnapshot, doc }) => {
                    const unsubUserData = onSnapshot(doc(db, 'users', usr.uid), (doc) => {
                        setUserData(doc.data());
                    });

                    registerForPushNotificationsAsync().then(token => {
                        if (token) {
                            updateDoc(doc(db, 'users', usr.uid), {
                                pushToken: token
                            }).catch(err => console.log("Error updating push token:", err));
                        }
                    });
                });
            } else {
                setUserData(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email, password, additionalData) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
            ...additionalData,
            createdAt: new Date().toISOString(),
        });

        return user;
    };

    const logout = () => {
        return signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
