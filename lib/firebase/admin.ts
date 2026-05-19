// Firebase Admin SDK — server-side only.
//
// Use this module from Next.js API routes, Server Actions, Route Handlers,
// and Cloud Functions. Never import from client components.
//
// Credentials are loaded from FIREBASE_SERVICE_ACCOUNT (the raw JSON content
// of a service-account key, as a single-line string). For local development
// keep this in .env.local; for Vercel set it as an environment variable in
// the project's settings.
//
// If the env var is missing, the first call to any admin getter throws a
// clear error rather than silently authenticating as the wrong identity.

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let cachedApp: App | null = null;

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT env var is not set. " +
        "Generate a key in Firebase Console → Project settings → Service accounts → Generate new private key, " +
        "then paste the JSON contents into .env.local (single line).",
    );
  }
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON. " +
        "Make sure the value is a single-line JSON string with internal newlines escaped (\\n).",
    );
  }
}

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0]!;
    return cachedApp;
  }

  const sa = loadServiceAccount();
  cachedApp = initializeApp({
    credential: cert(sa),
    projectId:
      (sa as { project_id?: string }).project_id ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  return cachedApp;
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminDb = (): Firestore => getFirestore(getAdminApp());
export const adminStorage = (): Storage => getStorage(getAdminApp());
