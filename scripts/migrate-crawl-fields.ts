// M11 step 1: add default crawl* fields to every existing organization.
// Idempotent — re-running won't clobber fields the operator has tuned.
//
//   organizations/{id}.crawlEnabled        ← default false
//   organizations/{id}.crawlStatus         ← consecutiveFailures: 0, totalCollected: 0
//
// Usage: pnpm tsx scripts/migrate-crawl-fields.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* .env.local missing OK */
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
    "Missing credentials: set FIREBASE_SERVICE_ACCOUNT in .env.local",
  );
}

loadEnvLocal();
initAdmin();

const db = getFirestore();

async function run() {
  const snap = await db.collection("organizations").get();
  console.log(`Found ${snap.size} organizations.`);
  let touched = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const patch: Record<string, unknown> = {};

    if (typeof data.crawlEnabled !== "boolean") {
      patch.crawlEnabled = false;
    }
    if (!data.crawlStatus || typeof data.crawlStatus !== "object") {
      patch.crawlStatus = {
        consecutiveFailures: 0,
        totalCollected: 0,
      };
    } else {
      // Patch missing sub-fields without clobbering populated ones.
      const cs = data.crawlStatus as Record<string, unknown>;
      const nestedPatch: Record<string, unknown> = {};
      if (typeof cs.consecutiveFailures !== "number") {
        nestedPatch["crawlStatus.consecutiveFailures"] = 0;
      }
      if (typeof cs.totalCollected !== "number") {
        nestedPatch["crawlStatus.totalCollected"] = 0;
      }
      Object.assign(patch, nestedPatch);
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }
    await d.ref.update(patch);
    console.log(`  ✔ ${d.id} — ${Object.keys(patch).join(", ")}`);
    touched++;
  }

  console.log(`\nDone. touched=${touched} skipped=${skipped}`);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
