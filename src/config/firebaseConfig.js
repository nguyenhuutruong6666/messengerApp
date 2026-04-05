import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyArI7eQTDlIIgHzE74SLh2byDrUk7x6wRA",
    authDomain: "messengerapp-48b7a.firebaseapp.com",
    projectId: "messengerapp-48b7a",
    storageBucket: "messengerapp-48b7a.firebasestorage.app",
    messagingSenderId: "177372306203",
    appId: "1:177372306203:web:af69743c359a05434851be",
    measurementId: "G-J3P1K9918D"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
