// Seeds /videos with 5 PUBLISHED entries (M9). Idempotent.
//
// All entries use the same placeholder YouTube ID (dQw4w9WgXcQ) so the
// thumbnail and iframe embed both work without further setup. Replace
// the youtubeUrl per entry once real videos are uploaded to K BALLET TV.
//
// Usage: pnpm seed:videos

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
const now = Timestamp.now();

// Placeholder ID — real channel uploads will replace these.
const PLACEHOLDER_ID = "dQw4w9WgXcQ";
const PLACEHOLDER_URL = `https://www.youtube.com/watch?v=${PLACEHOLDER_ID}`;
const PLACEHOLDER_THUMB = `https://img.youtube.com/vi/${PLACEHOLDER_ID}/hqdefault.jpg`;

type SeedDoc = { id: string; data: Record<string, unknown> };

const seeds: SeedDoc[] = [
  {
    id: "level-l0-intro",
    data: {
      status: "PUBLISHED",
      title: "발레 처음 시작할 때 — 자세 + 1번 포지션",
      description:
        "발레를 처음 배우는 분을 위한 가장 기본 자세 가이드. 어깨·골반·발 끝 정렬과 1번 포지션부터 천천히 짚어드려요.",
      youtubeUrl: PLACEHOLDER_URL,
      youtubeId: PLACEHOLDER_ID,
      thumbnailUrl: PLACEHOLDER_THUMB,
      series: "levels",
      type: "long",
      level: "L0",
      durationSeconds: 720,
      host: "K BALLET TV",
      relatedCompetitionIds: [],
      relatedAdmissionIds: [],
      relatedPerformanceIds: [],
      source: "manual",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "level-l1-pliers-tendu",
    data: {
      status: "PUBLISHED",
      title: "플리에·탕뒤·롱데 — 기본기 5분 가이드",
      description:
        "L1 단계에서 가장 많이 헷갈리는 플리에·탕뒤·롱데 자세를 5분 안에 정리한 쇼츠.",
      youtubeUrl: PLACEHOLDER_URL,
      youtubeId: PLACEHOLDER_ID,
      thumbnailUrl: PLACEHOLDER_THUMB,
      series: "levels",
      type: "short",
      level: "L1",
      durationSeconds: 300,
      host: "K BALLET TV",
      relatedCompetitionIds: [],
      relatedAdmissionIds: [],
      relatedPerformanceIds: [],
      source: "manual",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "admission-karts-roadmap",
    data: {
      status: "PUBLISHED",
      title: "한예종 입시 ABC — 무용원 합격 로드맵",
      description:
        "한국예술종합학교 무용원 발레전공을 준비하는 분을 위한 합격 로드맵. 실기 과목, 수능 비중, 면접 팁까지.",
      youtubeUrl: PLACEHOLDER_URL,
      youtubeId: PLACEHOLDER_ID,
      thumbnailUrl: PLACEHOLDER_THUMB,
      series: "admission",
      type: "long",
      durationSeconds: 1080,
      host: "K BALLET TV",
      relatedCompetitionIds: [],
      relatedAdmissionIds: ["karts-2027"],
      relatedPerformanceIds: [],
      source: "manual",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "competition-first-step",
    data: {
      status: "PUBLISHED",
      title: "콩쿠르 첫 도전 — 어디부터?",
      description:
        "처음 콩쿠르를 준비하는 분께 추천하는 국내·국제 예선 라인업과 부문 선택 기준을 정리했어요.",
      youtubeUrl: PLACEHOLDER_URL,
      youtubeId: PLACEHOLDER_ID,
      thumbnailUrl: PLACEHOLDER_THUMB,
      series: "competition",
      type: "long",
      durationSeconds: 480,
      host: "K BALLET TV",
      relatedCompetitionIds: ["kibc-2026", "ygp-korea-2026"],
      relatedAdmissionIds: [],
      relatedPerformanceIds: [],
      source: "manual",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "interview-karts-student-01",
    data: {
      status: "PUBLISHED",
      title: "발레인 인터뷰 #1 — 한예종 입시생",
      description:
        "한국예술종합학교 무용원 발레전공 입시를 준비 중인 학생과 나눈 솔직한 인터뷰. 하루 연습 루틴부터 슬럼프 극복까지.",
      youtubeUrl: PLACEHOLDER_URL,
      youtubeId: PLACEHOLDER_ID,
      thumbnailUrl: PLACEHOLDER_THUMB,
      series: "interview",
      type: "long",
      durationSeconds: 900,
      host: "K BALLET TV",
      relatedCompetitionIds: [],
      relatedAdmissionIds: ["karts-2027"],
      relatedPerformanceIds: [],
      source: "manual",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} videos into Firestore...`);
  for (const s of seeds) {
    await db.collection("videos").doc(s.id).set(s.data);
    console.log(`  ✔ ${s.id} — ${s.data.title}`);
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
