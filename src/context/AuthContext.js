import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { ref, set, update, onValue } from 'firebase/database';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubUserData = null;
        let resolved = false;

        AsyncStorage.getItem('auth_uid').then(cachedUid => {
            if (cachedUid && !resolved) setLoading(false);
        });

        const timeout = setTimeout(() => {
            if (!resolved) setLoading(false);
        }, 3000);

        const unsubscribe = onAuthStateChanged(auth, (usr) => {
            clearTimeout(timeout);
            resolved = true;

            setUser(usr);
            setLoading(false);

            if (usr) {
                AsyncStorage.setItem('auth_uid', usr.uid);
            } else {
                AsyncStorage.removeItem('auth_uid');
            }

            if (unsubUserData) {
                unsubUserData();
                unsubUserData = null;
            }

            if (usr) {

                unsubUserData = onValue(ref(db, `users/${usr.uid}`), (snapshot) => {
                    if (snapshot.exists()) setUserData(snapshot.val());
                });

                registerForPushNotificationsAsync().then(token => {
                    if (token) {
                        update(ref(db, `users/${usr.uid}`), { pushToken: token })
                            .catch(err => console.log('Error updating push token:', err));
                    }
                });
            } else {
                setUserData(null);
            }
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
            if (unsubUserData) unsubUserData();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email, password, additionalData) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const usr = userCredential.user;
        await set(ref(db, `users/${usr.uid}`), {
            ...additionalData,
            createdAt: Date.now(),
        });
        return usr;
    };

    const logout = () => {
        return signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, userData, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
