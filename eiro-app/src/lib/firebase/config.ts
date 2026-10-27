// Firebase client configuration
// Replace these placeholder values with your Firebase project credentials
// from Firebase Console → Project Settings → General → Your apps → Web app

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const environmentConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(environmentConfig).every(
  value => Boolean(value?.trim()) && !/^(your-|YOUR_)/i.test(value ?? '')
);

export function assertFirebaseConfigured(): void {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. Add the required NEXT_PUBLIC_FIREBASE_* values to .env.local.');
  }
}

const firebaseConfig = {
  apiKey: environmentConfig.apiKey || 'YOUR_API_KEY',
  authDomain: environmentConfig.authDomain || 'YOUR_PROJECT.firebaseapp.com',
  projectId: environmentConfig.projectId || 'YOUR_PROJECT_ID',
  storageBucket: environmentConfig.storageBucket || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: environmentConfig.messagingSenderId || 'YOUR_SENDER_ID',
  appId: environmentConfig.appId || 'YOUR_APP_ID',
};

// Initialize Firebase (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
