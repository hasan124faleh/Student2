import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3Hyi-tVMui0ZyPsezvoxxSFjCJQBme9Q",
  authDomain: "ss-app-87ac7.firebaseapp.com",
  projectId: "ss-app-87ac7",
  storageBucket: "ss-app-87ac7.firebasestorage.app",
  messagingSenderId: "7671656513",
  appId: "1:7671656513:web:21b51edb450bddd1aad6c0",
  measurementId: "G-LQPLFRBGKH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const studentsCollection = collection(db, "students");