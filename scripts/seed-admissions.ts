// Seeds /admissions with 5 PUBLISHED admission cycles (M7). Idempotent.
//
// Usage:
//   pnpm seed:admissions

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
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
    // .env.local missing OK
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
const now = Timestamp.now();
const d = (y: number, m: number, day: number) =>
  Timestamp.fromDate(new Date(y, m - 1, day));

type SeedDoc = { id: string; data: Record<string, unknown> };

const seeds: SeedDoc[] = [
  {
    id: "karts-2027",
    data: {
      status: "PUBLISHED",
      schoolType: "grad",
      schoolName: "한국예술종합학교",
      department: "무용원 발레전공 (예술사·예술전문사)",
      year: 2027,
      capacity: 20,
      regStart: d(2026, 11, 1),
      regEnd: d(2026, 11, 14),
      practical1: d(2026, 11, 28),
      practical2: d(2026, 12, 5),
      announcementAt: d(2026, 12, 19),
      subjects: ["발레 클래스", "지정 베리에이션", "컨템포러리 즉흥"],
      csat: "reference_only",
      fee: "₩90,000",
      guidelineUrl: "https://www.karts.ac.kr/main/appl.do",
      officialUrl: "https://www.karts.ac.kr",
      bonusCompetitions: ["kibc-2026", "ygp-korea-2026"],
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "sunhwa-2027",
    data: {
      status: "PUBLISHED",
      schoolType: "middle",
      schoolName: "선화예술중학교",
      department: "무용과 발레",
      year: 2027,
      capacity: 16,
      regStart: d(2026, 10, 12),
      regEnd: d(2026, 10, 16),
      practical1: d(2026, 11, 7),
      announcementAt: d(2026, 11, 21),
      subjects: ["기본기", "지정 베리에이션"],
      csat: "not_reflected",
      fee: "₩70,000",
      guidelineUrl: "https://www.sunhwaarts.ms.kr",
      officialUrl: "https://www.sunhwaarts.ms.kr",
      bonusCompetitions: [],
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "seoul-arts-high-2027",
    data: {
      status: "PUBLISHED",
      schoolType: "high",
      schoolName: "서울예술고등학교",
      department: "무용과 발레전공",
      year: 2027,
      capacity: 24,
      regStart: d(2026, 9, 14),
      regEnd: d(2026, 9, 18),
      practical1: d(2026, 10, 10),
      practical2: d(2026, 10, 17),
      announcementAt: d(2026, 10, 31),
      subjects: ["기본기", "베리에이션", "컨템포러리 즉흥"],
      csat: "not_reflected",
      fee: "₩80,000",
      guidelineUrl: "https://seoul-arts.sen.hs.kr",
      officialUrl: "https://seoul-arts.sen.hs.kr",
      bonusCompetitions: [],
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "yewon-2027",
    data: {
      status: "PUBLISHED",
      schoolType: "middle",
      schoolName: "예원학교",
      department: "무용과",
      year: 2027,
      capacity: 30,
      regStart: d(2026, 10, 5),
      regEnd: d(2026, 10, 9),
      practical1: d(2026, 11, 1),
      announcementAt: d(2026, 11, 14),
      subjects: ["기본기", "지정 베리에이션"],
      csat: "not_reflected",
      fee: "₩70,000",
      guidelineUrl: "https://www.yewon.ms.kr",
      officialUrl: "https://www.yewon.ms.kr",
      bonusCompetitions: [],
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "hansung-ballet-2027",
    data: {
      status: "PUBLISHED",
      schoolType: "university",
      schoolName: "한성대학교",
      department: "무용학과 발레전공",
      year: 2027,
      capacity: 18,
      regStart: d(2026, 11, 9),
      regEnd: d(2026, 11, 13),
      practical1: d(2026, 11, 27),
      announcementAt: d(2026, 12, 13),
      subjects: ["바리에이션", "컨템포러리"],
      csat: "reflected",
      fee: "₩85,000",
      guidelineUrl: "https://www.hansung.ac.kr/admission",
      officialUrl: "https://www.hansung.ac.kr",
      bonusCompetitions: ["kibc-2026"],
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} admissions into Firestore...`);
  for (const s of seeds) {
    await db.collection("admissions").doc(s.id).set(s.data);
    console.log(`  ✔ ${s.id} — ${s.data.schoolName} ${s.data.department}`);
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
