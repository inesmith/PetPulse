// services/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoNvg5j3figkBW41eK4tHqEqShSESZuWQ",
  authDomain: "petpulse-2d843.firebaseapp.com",
  projectId: "petpulse-2d843",
  storageBucket: "petpulse-2d843.firebasestorage.app",
  messagingSenderId: "354704738179",
  appId: "1:354704738179:web:c563cf97812bf57136d8b6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
