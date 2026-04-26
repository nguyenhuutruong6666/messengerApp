import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDpPQtsHUEHL7WAmklzbeC15PPOV6zbETk",
    authDomain: "messta.firebaseapp.com",
    projectId: "messta",
    storageBucket: "messta.firebasestorage.app",
    messagingSenderId: "168209576599",
    appId: "1:168209576599:web:eaecd5434ca9e56a99efd2",
    measurementId: "G-707WTY8T1B",
    databaseURL: "https://messta-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getDatabase(app);
