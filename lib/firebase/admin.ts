// Firebase Admin SDK — server-side only.
//
// Use this module from Next.js API routes, Server Actions, Route Handlers,
// and Cloud Functions. Never import from client components.
//
// SKELETON: credential loading is not yet wired up. The next setup step
// will add a service-account loader (FIREBASE_SERVICE_ACCOUNT env var for
// Vercel, or applicationDefault() on GCP). Until then, calling any of the
// admin getters below will throw a clear error so we fail fast instead of
// silently using the wrong identity.

import { getApps, type App } from 'firebase-admin/app';
// `initializeApp` and `cert` will be re-imported in the next step when we
// wire FIREBASE_SERVICE_ACCOUNT. Keep them out for now so ESLint stays happy.
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0]!;
    return cachedApp;
  }

  // TODO(T0 step 3+): wire credentials.
  // Likely shape:
  //   const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  //   cachedApp = initializeApp({ credential: cert(sa) });
  throw new Error(
    '[firebase-admin] Service account not configured. ' +
      'Add credential loading in lib/firebase/admin.ts before calling admin getters.',
  );
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminDb = (): Firestore => getFirestore(getAdminApp());
export const adminStorage = (): Storage => getStorage(getAdminApp());
