// Firebase modular SDK v9
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  updateDoc,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let auth = null;
let db = null;

try {
  // Sólo inicializamos Firebase si existe la API key (evita fallos en dev sin .env)
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase no configurado: VITE_FIREBASE_API_KEY ausente. Firebase deshabilitado en este entorno.");
  }
} catch (err) {
  console.warn("Error inicializando Firebase (deshabilitado en dev):", err && err.message ? err.message : err);
  app = null;
  auth = null;
  db = null;
}

export {
  auth,
  db,
  signInWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  updateDoc,
  orderBy,
  serverTimestamp,
  deleteDoc
};
