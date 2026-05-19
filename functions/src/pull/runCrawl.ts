import * as logger from "firebase-functions/logger";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {SOURCES, type PullSource} from "./sources";
import {
  extractItemsFromText,
  fetchSourceText,
  type CrawlerItem,
} from "./crawler";
import {competitionHash, hashAlreadyExists} from "./dedup";

export type CrawlerSourceResult = {
  source: string;
  ok: boolean;
  fetched: boolean;
  itemsExtracted: number;
  newDrafts: number;
  duplicates: number;
  error?: string;
};

export type CrawlerRunResult = {
  startedAt: string;
  finishedAt: string;
  newDrafts: number;
  totalExtracted: number;
  bySource: CrawlerSourceResult[];
};

function parseYmd(s: string | null): Timestamp | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return Timestamp.fromDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

async function processSource(
  source: PullSource,
  apiKey: string,
): Promise<CrawlerSourceResult> {
  const result: CrawlerSourceResult = {
    source: source.id,
    ok: false,
    fetched: false,
    itemsExtracted: 0,
    newDrafts: 0,
    duplicates: 0,
  };
  try {
    const fetched = await fetchSourceText(source);
    if (!fetched) {
      result.error = "fetch failed";
      return result;
    }
    result.fetched = true;

    const items = await extractItemsFromText(source, fetched.text, apiKey);
    result.itemsExtracted = items.length;

    const db = getFirestore();
    const now = FieldValue.serverTimestamp();

    for (const item of items) {
      const hash = competitionHash(item.name, item.dateStart);
      if (await hashAlreadyExists(hash)) {
        result.duplicates += 1;
        continue;
      }
      const doc = buildDraft(item, source, hash);
      const ref = await db.collection("competitions").add({
        ...doc,
        aiCollectedAt: now,
      });
      logger.info("[pull] DRAFT created", {
        source: source.id,
        id: ref.id,
        name: item.name,
        confidence: item.aiConfidence,
      });
      result.newDrafts += 1;
    }
    result.ok = true;
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err);
    logger.error("[pull] source failed", {
      source: source.id,
      error: result.error,
    });
  }
  return result;
}

function buildDraft(
  item: CrawlerItem,
  source: PullSource,
  hash: string,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    status: "DRAFT",
    category: item.category,
    source: "pull",
    pullSourceId: source.id,
    pullSourceUrl: source.url,
    pullHash: hash,
    name: item.name,
    host: item.host,
    venue: item.venue ?? "",
    sections: item.sections,
    ageGroups: item.ageGroups,
    officialUrl: item.officialUrl ?? source.url,
    aiConfidence: item.aiConfidence,
    aiFieldNotes: item.aiFieldNotes,
  };
  if (item.edition) doc.edition = item.edition;
  const ds = parseYmd(item.dateStart);
  const de = parseYmd(item.dateEnd);
  const rs = parseYmd(item.registrationStart);
  const re = parseYmd(item.registrationEnd);
  if (ds) doc.dateStart = ds;
  if (de) doc.dateEnd = de;
  if (rs) doc.registrationStart = rs;
  if (re) doc.registrationEnd = re;
  if (item.fee) doc.fee = item.fee;
  if (item.awards) doc.awards = item.awards;
  if (item.registerUrl) doc.registerUrl = item.registerUrl;
  return doc;
}

// Runs the full crawl: every source, sequentially. Errors in one source don't
// abort the rest. Returns a structured result that the caller can persist as
// /_meta/lastPullRun and surface in the admin dashboard.

export async function runCrawl(apiKey: string): Promise<CrawlerRunResult> {
  const startedAt = new Date().toISOString();
  const bySource: CrawlerSourceResult[] = [];

  for (const source of SOURCES) {
    const r = await processSource(source, apiKey);
    bySource.push(r);
  }

  const result: CrawlerRunResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    newDrafts: bySource.reduce((sum, r) => sum + r.newDrafts, 0),
    totalExtracted: bySource.reduce((sum, r) => sum + r.itemsExtracted, 0),
    bySource,
  };

  // Persist run metadata for the dashboard's "마지막 실행" tile.
  try {
    await getFirestore()
      .collection("_meta")
      .doc("lastPullRun")
      .set(
        {
          ...result,
          finishedAtTs: FieldValue.serverTimestamp(),
        },
        {merge: false},
      );
  } catch (err) {
    logger.warn("[pull] failed to write /_meta/lastPullRun", {err});
  }

  logger.info("[pull] run finished", {
    newDrafts: result.newDrafts,
    totalExtracted: result.totalExtracted,
    sources: result.bySource.map((s) => `${s.source}:${s.newDrafts}`).join(","),
  });
  return result;
}
