// One-time migration from the old hardcoded SOURCES list to the
// organizations-based pull crawler (M11).
//
// For each legacy source:
//   - find an existing organization with a matching name/shortName
//   - if found: patch crawlEnabled + crawlConfig
//   - if not found: create a new DRAFT organization
//
// Idempotent — re-running won't clobber operator edits because we only set
// fields we own (crawlEnabled, crawlConfig.*BoardUrl) when they're empty.
//
// Usage: pnpm tsx scripts/migrate-legacy-sources.ts

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
const now = Timestamp.now();

type LegacySource = {
  legacyId: string;          // historical id, used only for logs
  matchNames: string[];      // names to search against organizations.name/shortName/aliases
  createIfMissing?: {
    id: string;
    name: string;
    shortName?: string;
    type:
      | "UNIVERSITY"
      | "HIGH_SCHOOL"
      | "MIDDLE_SCHOOL"
      | "COMPANY"
      | "ASSOCIATION"
      | "COMPETITION_HOST"
      | "PERFORMANCE_HALL"
      | "ACADEMY"
      | "OTHER";
    region?: string;
    websiteUrl?: string;
    aliases?: string[];
  };
  crawlEnabled: boolean;
  competitionBoardUrl?: string;
  admissionBoardUrl?: string;
  performanceBoardUrl?: string;
  notes?: string;
};

const SOURCES: LegacySource[] = [
  {
    legacyId: "kibc",
    matchNames: ["코리아국제발레콩쿠르", "KIBC", "한국국제발레콩쿠르"],
    createIfMissing: {
      id: "kibc",
      name: "코리아국제발레콩쿠르 조직위원회",
      shortName: "KIBC",
      type: "COMPETITION_HOST",
      region: "서울",
      websiteUrl: "https://www.koreaballet.com",
      aliases: ["KIBC", "한국국제발레콩쿠르"],
    },
    crawlEnabled: true,
    competitionBoardUrl: "https://www.koreaballet.com",
  },
  {
    legacyId: "kba",
    matchNames: ["한국발레협회", "사단법인 한국발레협회"],
    // Already seeded as korea-ballet-association.
    crawlEnabled: true,
    competitionBoardUrl: "http://www.koreaballet.or.kr",
  },
  {
    legacyId: "ygp-korea",
    matchNames: ["YGP Korea", "Youth America Grand Prix Korea", "YAGP Korea"],
    createIfMissing: {
      id: "ygp-korea-host",
      name: "YGP Korea 조직위원회",
      shortName: "YGP Korea",
      type: "COMPETITION_HOST",
      region: "서울",
      websiteUrl: "https://yagp.org",
      aliases: ["YGP", "YAGP", "Youth America Grand Prix"],
    },
    crawlEnabled: true,
    competitionBoardUrl: "https://yagp.org/locations/korea",
  },
  {
    legacyId: "karts",
    matchNames: ["한국예술종합학교 무용원", "한예종", "K-Arts"],
    // Already seeded as karts-dance.
    crawlEnabled: true,
    admissionBoardUrl: "https://www.karts.ac.kr/main/appl.do",
    notes: "신뢰도 낮은 출처 — 결과 검수 필요",
  },
  {
    legacyId: "sunhwa",
    matchNames: ["선화예술중학교", "선화예중"],
    // Already seeded as sunhwa-arts-middle.
    crawlEnabled: false, // bot-blocked; keep config but leave OFF
    admissionBoardUrl: "https://www.sunhwaarts.ms.kr",
    notes: "봇 차단으로 접근 불가 — User-Agent 우회 또는 수동 입력 필요",
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function findOrg(matchNames: string[]): Promise<string | null> {
  const snap = await db.collection("organizations").get();
  const targets = new Set(matchNames.map(norm));
  for (const d of snap.docs) {
    const data = d.data();
    const candidates: string[] = [];
    if (typeof data.name === "string") candidates.push(data.name);
    if (typeof data.shortName === "string") candidates.push(data.shortName);
    if (Array.isArray(data.aliases)) {
      for (const a of data.aliases) {
        if (typeof a === "string") candidates.push(a);
      }
    }
    for (const c of candidates) {
      if (targets.has(norm(c))) return d.id;
    }
  }
  return null;
}

async function migrate(s: LegacySource) {
  let orgId = await findOrg(s.matchNames);

  if (!orgId) {
    if (!s.createIfMissing) {
      console.warn(
        `  ⚠ ${s.legacyId}: no match and no createIfMissing — skipped`,
      );
      return;
    }
    const c = s.createIfMissing;
    await db.collection("organizations").doc(c.id).set({
      name: c.name,
      shortName: c.shortName,
      type: c.type,
      region: c.region ?? null,
      websiteUrl: c.websiteUrl ?? null,
      aliases: c.aliases ?? [],
      tags: ["크롤소스"],
      status: "ACTIVE",
      workflowState: "PUBLISHED",
      source: "manual",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      crawlEnabled: false,
      crawlStatus: {
        consecutiveFailures: 0,
        totalCollected: 0,
      },
    });
    orgId = c.id;
    console.log(`  + created ${orgId} (${c.name})`);
  }

  const ref = db.collection("organizations").doc(orgId);
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  const existingCfg =
    (existing.crawlConfig as Record<string, string> | undefined) ?? {};

  const cfgUpdate: Record<string, string> = {...existingCfg};
  if (s.competitionBoardUrl && !cfgUpdate.competitionBoardUrl) {
    cfgUpdate.competitionBoardUrl = s.competitionBoardUrl;
  }
  if (s.admissionBoardUrl && !cfgUpdate.admissionBoardUrl) {
    cfgUpdate.admissionBoardUrl = s.admissionBoardUrl;
  }
  if (s.performanceBoardUrl && !cfgUpdate.performanceBoardUrl) {
    cfgUpdate.performanceBoardUrl = s.performanceBoardUrl;
  }

  const patch: Record<string, unknown> = {
    crawlEnabled: s.crawlEnabled,
    crawlConfig: cfgUpdate,
    updatedAt: now,
  };
  if (s.notes && !existing.notes) {
    patch.notes = s.notes;
  }

  await ref.update(patch);
  console.log(
    `  ✔ ${s.legacyId} → ${orgId}: enabled=${s.crawlEnabled} ` +
      `boards=${Object.keys(cfgUpdate).filter((k) => k.endsWith("BoardUrl")).length}`,
  );
}

async function run() {
  console.log(`Migrating ${SOURCES.length} legacy sources...`);
  for (const s of SOURCES) {
    await migrate(s);
  }
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
