// firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCoNvg5j3figkBW41eK4tHqEqShSESZuWQ",
  authDomain: "petpulse-2d843.firebaseapp.com",
  projectId: "petpulse-2d843",
  storageBucket: "petpulse-2d843.firebasestorage.app",
  messagingSenderId: "354704738179",
  appId: "1:354704738179:web:c563cf97812bf57136d8b6"
};

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// Explicitly use memory-only persistence (no AsyncStorage)
initializeAuth(app, { persistence: inMemoryPersistence });

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
