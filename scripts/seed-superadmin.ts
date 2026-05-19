// Seeds (or updates) a /users/{uid} document with a given role for the
// Firebase Auth user matching the given email.
//
// Idempotent: re-running is safe. Preserves an existing createdAt when present.
//
// Usage:
//   pnpm seed:superadmin
//   pnpm seed:superadmin some@email.com "다른 이름" ADMIN

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

function loadEnvLocal() {
  try {
    const txt = readFileSync(
      path.resolve(process.cwd(), ".env.local"),
      "utf-8",
    );
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local missing is OK — env vars may be set externally.
  }
}

function initAdmin() {
  if (getApps().length > 0) return;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    initializeApp({ credential: cert(JSON.parse(sa)) });
    return;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() });
    return;
  }
  throw new Error(
    "Missing credentials: set FIREBASE_SERVICE_ACCOUNT in .env.local " +
      "(or GOOGLE_APPLICATION_CREDENTIALS to a service-account file path).",
  );
}

loadEnvLocal();
initAdmin();

const email = process.argv[2] || "uedutainment@gmail.com";
const displayName = process.argv[3] || "포올";
const role = (process.argv[4] || "SUPER_ADMIN") as
  | "EDITOR"
  | "ADMIN"
  | "SUPER_ADMIN";

const ALLOWED_ROLES = ["EDITOR", "ADMIN", "SUPER_ADMIN"];
if (!ALLOWED_ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of ${ALLOWED_ROLES.join(", ")}`);
  process.exit(1);
}

async function run() {
  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      console.error(
        `No Firebase Auth user with email "${email}". Create one first:`,
      );
      console.error(
        "  https://console.firebase.google.com/u/0/project/ballet-d0d4c/authentication/users",
      );
      process.exit(1);
    }
    throw err;
  }

  console.log(`Found auth user: ${user.uid} (${user.email})`);

  const docRef = db.collection("users").doc(user.uid);
  const existing = await docRef.get();
  const hasCreatedAt =
    existing.exists && existing.data()?.createdAt !== undefined;

  const data: Record<string, unknown> = {
    email: user.email,
    displayName,
    role,
  };
  if (!hasCreatedAt) {
    data.createdAt = Timestamp.now();
  }

  await docRef.set(data, { merge: true });

  console.log(
    `✔ users/${user.uid} → role=${role}, displayName=${displayName}` +
      (hasCreatedAt ? " (createdAt preserved)" : " (createdAt set to now)"),
  );
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
