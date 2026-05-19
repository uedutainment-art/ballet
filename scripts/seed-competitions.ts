// Seeds the Firestore `competitions` collection with 5 PUBLISHED entries.
//
// Idempotent: each entry has a fixed document ID, so re-running the script
// overwrites the same docs and does not create duplicates.
//
// Usage:
//   pnpm seed:competitions
//   # or: pnpm tsx scripts/seed-competitions.ts
//
// Auth:
//   FIREBASE_SERVICE_ACCOUNT in .env.local (raw JSON content, one line).
//   Generate at: Firebase Console → Project settings → Service accounts →
//   Generate new private key.

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Tiny .env.local loader — avoids a `dotenv` dependency. Single-line values
// only; multi-line JSON in FIREBASE_SERVICE_ACCOUNT must use escaped \n.
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
    // No .env.local — env vars may still be set externally.
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

const db = getFirestore();
const now = Timestamp.now();
const d = (y: number, m: number, day: number) =>
  Timestamp.fromDate(new Date(y, m - 1, day));

type SeedDoc = {
  id: string;
  data: Record<string, unknown>;
};

const seeds: SeedDoc[] = [
  {
    id: "kibc-2026",
    data: {
      status: "PUBLISHED",
      category: "domestic_major",
      name: "KIBC 2026 한국국제발레콩쿠르",
      host: "한국발레협회",
      edition: "제8회",
      dateStart: d(2026, 7, 25),
      dateEnd: d(2026, 7, 30),
      registrationStart: d(2026, 5, 15),
      registrationEnd: d(2026, 6, 15),
      venue: "예술의전당 토월극장",
      sections: [
        "주니어 클래식",
        "주니어 컨템포러리",
        "시니어 클래식",
        "시니어 컨템포러리",
      ],
      ageGroups: ["만 9-13세", "만 14-17세", "만 18-25세"],
      fee: "부문당 ₩150,000",
      awards: "그랑프리 ₩5,000,000 · 1위 ₩3,000,000",
      officialUrl: "https://kibc.kr",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "ygp-korea-2026",
    data: {
      status: "PUBLISHED",
      category: "intl_korea_round",
      name: "Korea Youth Ballet 2026 (YGP Korea)",
      host: "YGP Korea",
      edition: "Round 1",
      dateStart: d(2026, 8, 10),
      dateEnd: d(2026, 8, 15),
      registrationStart: d(2026, 5, 20),
      registrationEnd: d(2026, 7, 10),
      venue: "LG아트센터 서울",
      sections: ["프리주니어", "주니어", "시니어"],
      ageGroups: ["만 9-11세", "만 12-14세", "만 15-19세"],
      fee: "₩180,000",
      awards: "본선(YGP NY) 진출권 + 장학금",
      officialUrl: "https://ygpkorea.org",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "asia-grand-prix-2026",
    data: {
      status: "PUBLISHED",
      category: "intl_korea_round",
      name: "아시아 발레 그랑프리 2026",
      host: "Asia Ballet Grand Prix Committee",
      dateStart: d(2026, 8, 2),
      dateEnd: d(2026, 8, 4),
      registrationStart: d(2026, 5, 1),
      registrationEnd: d(2026, 6, 20),
      venue: "충남예술의전당",
      sections: ["프리주니어", "주니어", "시니어", "그랑프리"],
      ageGroups: ["만 8-11세", "만 12-14세", "만 15-19세"],
      fee: "부문당 ₩120,000",
      awards: "그랑프리 ₩3,000,000 · 부문 1위 각 ₩1,500,000",
      officialUrl: "https://asiaballetgp.com",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "vibe-korea-2026",
    data: {
      status: "PUBLISHED",
      category: "domestic_general",
      name: "Vibe Korea 발레 경연 2026",
      host: "Vibe Korea Ballet",
      edition: "제3회",
      dateStart: d(2026, 9, 13),
      dateEnd: d(2026, 9, 13),
      registrationStart: d(2026, 7, 1),
      registrationEnd: d(2026, 8, 25),
      venue: "예림당 아트홀",
      sections: ["클래식 솔로", "컨템포러리 솔로", "듀엣"],
      ageGroups: ["만 8-11세", "만 12-14세", "만 15세 이상"],
      fee: "₩80,000",
      awards: "부문별 대상 ₩1,000,000 + 상장",
      officialUrl: "https://vibekoreaballet.kr",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "tbc-2026",
    data: {
      status: "PUBLISHED",
      category: "domestic_major",
      name: "TBC 국제발레콩쿠르 2026",
      host: "TBC 국제발레콩쿠르 조직위원회",
      edition: "제15회",
      dateStart: d(2026, 8, 10),
      dateEnd: d(2026, 8, 14),
      registrationStart: d(2026, 5, 10),
      registrationEnd: d(2026, 6, 22),
      venue: "대구문화예술회관 팔공홀",
      sections: ["주니어 클래식", "주니어 컨템포러리", "시니어 클래식"],
      ageGroups: ["만 9-13세", "만 14-17세", "만 18-25세"],
      fee: "부문당 ₩130,000",
      awards: "대상 ₩3,000,000 + 해외 유학 추천",
      officialUrl: "https://tbcballet.kr",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} competitions into Firestore...`);
  for (const s of seeds) {
    await db.collection("competitions").doc(s.id).set(s.data);
    console.log(`  ✔ ${s.id}`);
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
