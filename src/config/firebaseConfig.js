import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Analytics is optional and may require specific native setup in RN

const firebaseConfig = {
    apiKey: "AIzaSyDpMeaxIOsDUzJH4hvLy94je7paJSz5NNY",
    authDomain: "messengerapp-48b7a.firebaseapp.com",
    projectId: "messengerapp-48b7a",
    storageBucket: "messengerapp-48b7a.firebasestorage.app",
    messagingSenderId: "177372306203",
    appId: "1:177372306203:web:85cd30f7abbd3f904851be",
    measurementId: "G-LJ1H0YP56L"
};

const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app); 
