import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase config - replace with your own from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCoNvg5j3figkBW41eK4tHqEqShSESZuWQ",
  authDomain: "petpulse-2d843.firebaseapp.com",
  projectId: "petpulse-2d843",
  storageBucket: "petpulse-2d843.firebasestorage.app",
  messagingSenderId: "354704738179",
  appId: "1:354704738179:web:c563cf97812bf57136d8b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
 