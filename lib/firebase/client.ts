// Firebase Web SDK — client-side initialization.
//
// Use this module from client components, hooks, and any browser-side code
// (auth UI, real-time Firestore listeners, Storage uploads from the browser).
//
// For server-side admin operations (verifying ID tokens, privileged Firestore
// writes), use lib/firebase/admin.ts instead.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Singleton: Next.js HMR and React Server Components can re-evaluate this
// module multiple times. Firebase throws if initializeApp runs twice for the
// same app name, so reuse the existing instance when present.
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
// Functions are deployed to asia-northeast3 (Seoul) — pin the region here so
// callable invocations route correctly without per-call overrides.
export const functions: Functions = getFunctions(app, 'asia-northeast3');
export { app };
