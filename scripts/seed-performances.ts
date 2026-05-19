// Seeds /performances with 5 PUBLISHED entries (M8). Idempotent.
//
// Usage: pnpm seed:performances

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
const d = (y: number, m: number, day: number) =>
  Timestamp.fromDate(new Date(y, m - 1, day));

type SeedDoc = { id: string; data: Record<string, unknown> };

const seeds: SeedDoc[] = [
  {
    id: "knb-swan-lake-2026",
    data: {
      status: "PUBLISHED",
      title: "백조의 호수",
      company: "국립발레단",
      companyType: "national",
      venue: "예술의전당 오페라극장",
      dateStart: d(2026, 7, 17),
      dateEnd: d(2026, 7, 26),
      showtimes: [
        "7/17 19:30",
        "7/18 14:00 · 19:30",
        "7/19 14:00",
        "7/23 19:30",
        "7/24 19:30",
        "7/25 14:00 · 19:30",
        "7/26 14:00",
      ],
      ticketPriceMin: 10000,
      ticketPriceMax: 90000,
      ticketUrl: "https://www.sacticket.co.kr",
      description:
        "유리 그리고로비치 안무 「백조의 호수」 — 클래식 발레의 정수를 보여주는 국립발레단의 대표 레퍼토리.",
      choreographer: "유리 그리고로비치",
      composer: "차이콥스키",
      runtime: 150,
      ageLimit: "8세 이상",
      officialUrl: "https://www.kballet.org",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "uballet-bayadere-2026",
    data: {
      status: "PUBLISHED",
      title: "라 바야데르",
      company: "유니버설발레단",
      companyType: "private",
      venue: "충무아트센터 대극장",
      dateStart: d(2026, 9, 11),
      dateEnd: d(2026, 9, 20),
      showtimes: [
        "9/11 19:30",
        "9/12 15:00 · 19:30",
        "9/13 14:00",
        "9/18 19:30",
        "9/19 15:00 · 19:30",
        "9/20 14:00",
      ],
      ticketPriceMin: 20000,
      ticketPriceMax: 130000,
      ticketUrl: "https://ticket.interpark.com",
      description:
        "동방의 신비를 그리는 마리우스 프티파의 명작. 유니버설발레단 35주년 기념 공연.",
      choreographer: "마리우스 프티파 / 유리 그리고로비치 (재안무)",
      composer: "루드비히 밍쿠스",
      runtime: 165,
      ageLimit: "8세 이상",
      officialUrl: "https://www.universalballet.com",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "sbt-contemporary-2026",
    data: {
      status: "PUBLISHED",
      title: "Crossroads — SBT 컨템포러리 신작",
      company: "서울발레씨어터",
      companyType: "private",
      venue: "강동아트센터 대극장 한강",
      dateStart: d(2026, 11, 14),
      dateEnd: d(2026, 11, 15),
      showtimes: ["11/14 19:30", "11/15 15:00 · 19:30"],
      ticketPriceMin: 20000,
      ticketPriceMax: 60000,
      ticketUrl: "https://www.gangdongarts.or.kr",
      description:
        "서울발레씨어터가 선보이는 세 가지 컨템포러리 단막작. 클래식 발레의 어휘를 현대로 옮긴 시도.",
      choreographer: "박재근 외 2인",
      runtime: 90,
      ageLimit: "12세 이상",
      officialUrl: "https://www.seoulballettheatre.com",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "kba-young-2026",
    data: {
      status: "PUBLISHED",
      title: "젊은 무용가의 밤",
      company: "한국발레협회",
      companyType: "national",
      venue: "아르코예술극장 대극장",
      dateStart: d(2026, 12, 5),
      dateEnd: d(2026, 12, 6),
      showtimes: ["12/5 19:00", "12/6 15:00 · 19:00"],
      ticketPriceMin: 10000,
      ticketPriceMax: 30000,
      ticketUrl: "https://ticket.interpark.com",
      description:
        "한국발레협회가 매년 선보이는 신인 발레리노/발레리나 쇼케이스. 콩쿠르 입상자 중심 캐스팅.",
      runtime: 110,
      ageLimit: "전체관람가",
      officialUrl: "http://www.koreaballet.or.kr",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
  {
    id: "kballet-tour-2027",
    data: {
      status: "PUBLISHED",
      title: "K-Ballet Tour 2027 — 지역 순회 공연",
      company: "K-Ballet Tour",
      companyType: "other",
      venue: "전국 8개 시 (춘천 · 청주 · 광주 · 부산 외)",
      dateStart: d(2027, 3, 6),
      dateEnd: d(2027, 4, 18),
      showtimes: [],
      ticketPriceMin: 15000,
      ticketPriceMax: 40000,
      description:
        "발레 인프라가 부족한 지역을 찾아가는 6주간의 순회 공연. 도시별 일정은 공식 사이트 참조.",
      runtime: 100,
      ageLimit: "전체관람가",
      officialUrl: "https://www.kballet.org/tour",
      source: "pull",
      aiCollectedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    },
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} performances into Firestore...`);
  for (const s of seeds) {
    await db.collection("performances").doc(s.id).set(s.data);
    console.log(`  ✔ ${s.id} — ${s.data.title} · ${s.data.company}`);
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
