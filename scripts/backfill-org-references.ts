// Backfill orgId references on existing content (M10).
//
// Scans /organizations once, builds a name → org index, then walks
// competitions / admissions / performances / videos and fills in:
//   - competitions.hostOrgId          ← match on `host`
//   - admissions.schoolOrgId          ← match on `schoolName`
//   - performances.companyOrgId       ← match on `company`
//   - performances.venueOrgId         ← match on `venue`
//
// Matching strategy (per content row):
//   1. Exact name match against /organizations.name
//   2. Exact match against /organizations.shortName
//   3. Exact match against any alias
//   4. Substring fallback (org name fully contained, or alias fully contained)
//
// Ambiguous matches (>1 candidate) and no-match cases are reported but not
// written. Already-set orgIds are left alone.
//
// Usage: pnpm tsx scripts/backfill-org-references.ts [--dry]

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

const dryRun = process.argv.includes("--dry");
const db = getFirestore();

type OrgIndex = {
  byExact: Map<string, string>;       // name|short|alias → orgId
  contains: Array<{ key: string; id: string }>;
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadOrgs(): Promise<OrgIndex> {
  const snap = await db.collection("organizations").get();
  const byExact = new Map<string, string>();
  const contains: Array<{ key: string; id: string }> = [];
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
      const key = norm(c);
      if (!key) continue;
      if (!byExact.has(key)) byExact.set(key, d.id);
      contains.push({ key, id: d.id });
    }
  }
  console.log(
    `Loaded ${snap.docs.length} orgs · ${byExact.size} unique lookup keys`,
  );
  return { byExact, contains };
}

type MatchOutcome =
  | { kind: "none" }
  | { kind: "exact"; orgId: string }
  | { kind: "substring"; orgId: string; via: string }
  | { kind: "ambiguous"; orgIds: string[] };

function match(needle: string, idx: OrgIndex): MatchOutcome {
  const q = norm(needle);
  if (!q) return { kind: "none" };

  const exact = idx.byExact.get(q);
  if (exact) return { kind: "exact", orgId: exact };

  // Substring matches: either the org's name/alias appears in needle, or
  // needle appears in the org's name. Either direction is a soft signal.
  const hits = new Set<string>();
  for (const c of idx.contains) {
    if (c.key.length < 2) continue;
    if (q.includes(c.key) || c.key.includes(q)) {
      hits.add(c.id);
    }
  }
  if (hits.size === 0) return { kind: "none" };
  if (hits.size === 1) {
    const orgId = Array.from(hits)[0];
    return { kind: "substring", orgId, via: q };
  }
  return { kind: "ambiguous", orgIds: Array.from(hits) };
}

type Report = {
  collection: string;
  exact: number;
  substring: number;
  ambiguous: number;
  none: number;
  alreadySet: number;
  ambiguousIds: string[];
  noneIds: string[];
};

function blankReport(c: string): Report {
  return {
    collection: c,
    exact: 0,
    substring: 0,
    ambiguous: 0,
    none: 0,
    alreadySet: 0,
    ambiguousIds: [],
    noneIds: [],
  };
}

async function backfill(
  idx: OrgIndex,
  collection: string,
  needleFields: string[],     // e.g. ["host"] or ["company", "venue"]
  orgIdFields: string[],      // matching e.g. ["hostOrgId"] or ["companyOrgId", "venueOrgId"]
): Promise<Report> {
  const report = blankReport(collection);
  const snap = await db.collection(collection).get();

  for (const d of snap.docs) {
    const data = d.data();
    const patch: Record<string, string> = {};

    for (let i = 0; i < needleFields.length; i++) {
      const needle = (data[needleFields[i]] as string | undefined) ?? "";
      const orgIdField = orgIdFields[i];
      if (data[orgIdField]) {
        report.alreadySet++;
        continue;
      }
      if (!needle.trim()) {
        report.none++;
        continue;
      }
      const m = match(needle, idx);
      switch (m.kind) {
      case "exact":
        report.exact++;
        patch[orgIdField] = m.orgId;
        break;
      case "substring":
        report.substring++;
        patch[orgIdField] = m.orgId;
        break;
      case "ambiguous":
        report.ambiguous++;
        report.ambiguousIds.push(
          `${d.id}::${needleFields[i]}::"${needle}" → ${m.orgIds.join(",")}`,
        );
        break;
      case "none":
        report.none++;
        report.noneIds.push(`${d.id}::${needleFields[i]}::"${needle}"`);
        break;
      }
    }

    if (Object.keys(patch).length > 0 && !dryRun) {
      await db.collection(collection).doc(d.id).update(patch);
    }
  }

  return report;
}

function printReport(r: Report) {
  console.log(`\n[${r.collection}] ─────────────────────────`);
  console.log(`  exact matches:     ${r.exact}`);
  console.log(`  substring matches: ${r.substring}`);
  console.log(`  ambiguous:         ${r.ambiguous}`);
  console.log(`  no match:          ${r.none}`);
  console.log(`  already set:       ${r.alreadySet}`);
  if (r.ambiguousIds.length > 0) {
    console.log("  AMBIGUOUS (need manual review):");
    for (const a of r.ambiguousIds) console.log(`    ${a}`);
  }
  if (r.noneIds.length > 0 && r.noneIds.length <= 20) {
    console.log("  NO MATCH:");
    for (const a of r.noneIds) console.log(`    ${a}`);
  } else if (r.noneIds.length > 20) {
    console.log(`  NO MATCH: ${r.noneIds.length} entries (first 5 shown)`);
    for (const a of r.noneIds.slice(0, 5)) console.log(`    ${a}`);
  }
}

async function run() {
  console.log(`Backfill mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  const idx = await loadOrgs();

  const compReport = await backfill(idx, "competitions", ["host"], ["hostOrgId"]);
  printReport(compReport);

  const admReport = await backfill(idx, "admissions", ["schoolName"], ["schoolOrgId"]);
  printReport(admReport);

  const perfReport = await backfill(
    idx,
    "performances",
    ["company", "venue"],
    ["companyOrgId", "venueOrgId"],
  );
  printReport(perfReport);

  // Videos have multi-org via relatedOrgIds — backfill is left manual since
  // the existing data doesn't carry org names per video. Skip.

  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
