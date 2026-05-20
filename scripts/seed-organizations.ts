// Seeds /organizations with 30 PUBLISHED entries (M10). Idempotent.
//
// Each entry is the minimum identity needed for cross-domain references:
// name, shortName/aliases, type, region, websiteUrl. Logos are intentionally
// blank — operators fill them in from the admin editor (AI candidates or
// manual upload).
//
// Usage: pnpm seed:organizations

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

type Seed = {
  id: string;
  name: string;
  shortName?: string;
  englishName?: string;
  aliases?: string[];
  type:
    | "UNIVERSITY"
    | "HIGH_SCHOOL"
    | "MIDDLE_SCHOOL"
    | "ACADEMY"
    | "ASSOCIATION"
    | "COMPANY"
    | "COMPETITION_HOST"
    | "PERFORMANCE_HALL"
    | "OTHER";
  region: string;
  websiteUrl?: string;
  establishedYear?: number;
  description?: string;
  tags?: string[];
};

const seeds: Seed[] = [
  // ---------- Universities (10) ----------
  {
    id: "karts-dance",
    name: "한국예술종합학교 무용원",
    shortName: "한예종 무용원",
    englishName: "Korea National University of Arts — School of Dance",
    aliases: ["한예종", "K-Arts", "한국예종"],
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.karts.ac.kr",
    establishedYear: 1996,
    description: "한국 최고의 무용 전문 교육기관. 발레·한국무용·창작 전공.",
    tags: ["국립", "발레전공"],
  },
  {
    id: "ewha-dance",
    name: "이화여자대학교 무용학과",
    shortName: "이대 무용",
    englishName: "Ewha Womans University — Department of Dance",
    aliases: ["이화여대 무용", "EWHA"],
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://dance.ewha.ac.kr",
    tags: ["사립", "여대"],
  },
  {
    id: "sejong-dance",
    name: "세종대학교 무용과",
    shortName: "세종대 무용",
    englishName: "Sejong University — Department of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.sejong.ac.kr",
    tags: ["사립"],
  },
  {
    id: "hanyang-dance",
    name: "한양대학교 무용학과",
    shortName: "한양대 무용",
    englishName: "Hanyang University — Department of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.hanyang.ac.kr",
    tags: ["사립"],
  },
  {
    id: "sookmyung-dance",
    name: "숙명여자대학교 무용과",
    shortName: "숙대 무용",
    englishName: "Sookmyung Women's University — Department of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.sookmyung.ac.kr",
    tags: ["사립", "여대"],
  },
  {
    id: "chungang-dance",
    name: "중앙대학교 무용학과",
    shortName: "중앙대 무용",
    englishName: "Chung-Ang University — Department of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.cau.ac.kr",
    tags: ["사립"],
  },
  {
    id: "kyunghee-dance",
    name: "경희대학교 무용학부",
    shortName: "경희대 무용",
    englishName: "Kyung Hee University — School of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.khu.ac.kr",
    tags: ["사립"],
  },
  {
    id: "skku-dance",
    name: "성균관대학교 무용학과",
    shortName: "성대 무용",
    englishName: "Sungkyunkwan University — Department of Dance",
    type: "UNIVERSITY",
    region: "서울",
    websiteUrl: "https://www.skku.edu",
    tags: ["사립"],
  },
  {
    id: "dankook-dance",
    name: "단국대학교 무용과",
    shortName: "단국대 무용",
    englishName: "Dankook University — Department of Dance",
    type: "UNIVERSITY",
    region: "경기",
    websiteUrl: "https://www.dankook.ac.kr",
    tags: ["사립"],
  },
  {
    id: "pusan-dance",
    name: "부산대학교 무용학과",
    shortName: "부산대 무용",
    englishName: "Pusan National University — Department of Dance",
    type: "UNIVERSITY",
    region: "부산",
    websiteUrl: "https://www.pusan.ac.kr",
    tags: ["국립"],
  },

  // ---------- High Schools (6) ----------
  {
    id: "sunhwa-arts-high",
    name: "선화예술고등학교",
    shortName: "선화예고",
    aliases: ["선화예고"],
    type: "HIGH_SCHOOL",
    region: "서울",
    websiteUrl: "https://sunhwa.sen.hs.kr",
    tags: ["예술고"],
  },
  {
    id: "korea-nat-music-high",
    name: "국립국악고등학교",
    shortName: "국립국악고",
    englishName: "Korea National High School of Traditional Arts",
    aliases: ["국악고"],
    type: "HIGH_SCHOOL",
    region: "서울",
    websiteUrl: "http://www.gugak-h.kr",
    tags: ["국립", "무용전공"],
  },
  {
    id: "seoul-arts-high",
    name: "서울예술고등학교",
    shortName: "서울예고",
    aliases: ["서울예고"],
    type: "HIGH_SCHOOL",
    region: "서울",
    websiteUrl: "https://seoularts.sen.hs.kr",
    tags: ["사립", "예술고"],
  },
  {
    id: "gyewon-arts-high",
    name: "계원예술고등학교",
    shortName: "계원예고",
    aliases: ["계원예고"],
    type: "HIGH_SCHOOL",
    region: "경기",
    websiteUrl: "https://www.gaeh.hs.kr",
    tags: ["사립", "예술고"],
  },
  {
    id: "busan-arts-high",
    name: "부산예술고등학교",
    shortName: "부산예고",
    aliases: ["부산예고"],
    type: "HIGH_SCHOOL",
    region: "부산",
    websiteUrl: "https://busan-arts-h.bse.hs.kr",
    tags: ["예술고"],
  },
  {
    id: "incheon-arts-high",
    name: "인천예술고등학교",
    shortName: "인천예고",
    aliases: ["인천예고"],
    type: "HIGH_SCHOOL",
    region: "인천",
    websiteUrl: "https://incheon-arts-h.ice.hs.kr",
    tags: ["예술고"],
  },

  // ---------- Middle Schools (4) ----------
  {
    id: "yewon-school",
    name: "예원학교",
    shortName: "예원",
    aliases: ["예원학교"],
    type: "MIDDLE_SCHOOL",
    region: "서울",
    websiteUrl: "https://yewon.sen.ms.kr",
    establishedYear: 1965,
    description: "국내 최고 수준의 예술 중학교 중 하나. 무용 전공 운영.",
    tags: ["사립", "예술중"],
  },
  {
    id: "sunhwa-arts-middle",
    name: "선화예술중학교",
    shortName: "선화예중",
    aliases: ["선화예중"],
    type: "MIDDLE_SCHOOL",
    region: "서울",
    websiteUrl: "https://sunhwa.sen.ms.kr",
    tags: ["예술중"],
  },
  {
    id: "seoul-arts-middle",
    name: "서울예술중학교",
    shortName: "서울예중",
    aliases: ["서울예중"],
    type: "MIDDLE_SCHOOL",
    region: "서울",
    websiteUrl: "https://seoularts.sen.ms.kr",
    tags: ["예술중"],
  },
  {
    id: "gyewon-arts-middle",
    name: "계원예술중학교",
    shortName: "계원예중",
    aliases: ["계원예중"],
    type: "MIDDLE_SCHOOL",
    region: "경기",
    websiteUrl: "https://www.gaem.ms.kr",
    tags: ["예술중"],
  },

  // ---------- Companies (5) ----------
  {
    id: "korea-national-ballet",
    name: "국립발레단",
    shortName: "국발",
    englishName: "Korean National Ballet",
    aliases: ["KNB", "국립발레단"],
    type: "COMPANY",
    region: "서울",
    websiteUrl: "https://www.kballet.org",
    establishedYear: 1962,
    description: "한국을 대표하는 국립 발레단. 백조의 호수 등 클래식 대표작 운영.",
    tags: ["국립"],
  },
  {
    id: "universal-ballet",
    name: "유니버설발레단",
    shortName: "유발",
    englishName: "Universal Ballet",
    aliases: ["UBC", "유니버설"],
    type: "COMPANY",
    region: "서울",
    websiteUrl: "https://www.universalballet.com",
    establishedYear: 1984,
    description: "한국 최초의 민간 발레단. 라 바야데르·심청 등 레퍼토리.",
    tags: ["사립"],
  },
  {
    id: "seoul-ballet-theatre",
    name: "서울발레씨어터",
    shortName: "SBT",
    englishName: "Seoul Ballet Theatre",
    aliases: ["서울발레시어터", "SBT"],
    type: "COMPANY",
    region: "서울",
    websiteUrl: "https://www.seoulballettheatre.com",
    tags: ["사립", "컨템포러리"],
  },
  {
    id: "wise-ballet-theatre",
    name: "와이즈발레단",
    shortName: "와이즈발레",
    englishName: "Wise Ballet Theatre",
    aliases: ["와이즈발레단"],
    type: "COMPANY",
    region: "서울",
    websiteUrl: "https://www.wiseballet.com",
    tags: ["사립"],
  },
  {
    id: "gwangju-city-ballet",
    name: "광주시립발레단",
    shortName: "광주시립발레",
    aliases: ["광주시립발레단"],
    type: "COMPANY",
    region: "광주",
    websiteUrl: "https://gjarts.gwangju.go.kr",
    tags: ["시립"],
  },

  // ---------- Associations (3) ----------
  {
    id: "korea-ballet-association",
    name: "사단법인 한국발레협회",
    shortName: "한국발레협회",
    englishName: "Korea Ballet Association",
    aliases: ["KBA", "한발협"],
    type: "ASSOCIATION",
    region: "서울",
    websiteUrl: "http://www.koreaballet.or.kr",
    tags: ["협회", "콩쿠르주관"],
  },
  {
    id: "korea-ballet-foundation",
    name: "재단법인 한국발레재단",
    shortName: "한국발레재단",
    englishName: "Korea Ballet Foundation",
    aliases: ["KBF"],
    type: "ASSOCIATION",
    region: "서울",
    tags: ["재단"],
  },
  {
    id: "kpdaf",
    name: "사단법인 한국전문무용수지원센터",
    shortName: "전문무용수지원센터",
    englishName: "Korea Performing Arts Dance Aid Foundation",
    aliases: ["KPDAF"],
    type: "ASSOCIATION",
    region: "서울",
    websiteUrl: "https://kpdaf.or.kr",
    tags: ["지원기관"],
  },

  // ---------- Performance Halls (2) ----------
  {
    id: "sac-opera-house",
    name: "예술의전당 오페라극장",
    shortName: "예술의전당",
    englishName: "Seoul Arts Center — Opera House",
    aliases: ["SAC", "예술의전당", "예당"],
    type: "PERFORMANCE_HALL",
    region: "서울",
    websiteUrl: "https://www.sac.or.kr",
    establishedYear: 1988,
    description: "한국 최대 규모의 종합 공연장. 2300석 규모의 오페라극장 운영.",
    tags: ["대극장"],
  },
  {
    id: "sejong-grand-theater",
    name: "세종문화회관 대극장",
    shortName: "세종문화회관",
    englishName: "Sejong Center — Grand Theater",
    aliases: ["세종문화회관", "세종"],
    type: "PERFORMANCE_HALL",
    region: "서울",
    websiteUrl: "https://www.sejongpac.or.kr",
    establishedYear: 1978,
    description: "광화문 광장 인근 대규모 공연장. 3000석 규모의 대극장 운영.",
    tags: ["대극장"],
  },
];

async function run() {
  console.log(`Seeding ${seeds.length} organizations into Firestore...`);
  for (const s of seeds) {
    const data: Record<string, unknown> = {
      name: s.name,
      type: s.type,
      region: s.region,
      aliases: s.aliases ?? [],
      tags: s.tags ?? [],
      status: "ACTIVE",
      workflowState: "PUBLISHED",
      source: "manual",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      lastVerifiedAt: now,
    };
    if (s.shortName) data.shortName = s.shortName;
    if (s.englishName) data.englishName = s.englishName;
    if (s.websiteUrl) data.websiteUrl = s.websiteUrl;
    if (s.establishedYear) data.establishedYear = s.establishedYear;
    if (s.description) data.description = s.description;

    await db.collection("organizations").doc(s.id).set(data, { merge: true });
    console.log(`  ✔ ${s.id} — ${s.name}`);
  }
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
