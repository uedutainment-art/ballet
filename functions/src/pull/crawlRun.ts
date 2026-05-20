// M11 crawl-run bookkeeping. One CrawlRun doc per scheduler invocation (or
// manual trigger). Updated incrementally as per-org work finishes so the
// /admin/crawl-runs page can render live progress.

import {
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

export type CrawlRunStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "RUNNING";
export type CrawlTriggerType =
  | "SCHEDULED"
  | "MANUAL_ORG"
  | "MANUAL_ALL";
export type CrawlDomain = "competition" | "admission" | "performance";

export type CrawlOrgResult = {
  orgId: string;
  orgName: string;
  domain: CrawlDomain;
  boardUrl: string;
  urlsFetched: number;
  newItemsCreated: number;
  skippedDuplicates: number;
  aiCallsUsed: number;
  durationMs: number;
  errorMessage?: string;
  sampleUrls?: string[];
};

export type CreateRunInput = {
  triggerType: CrawlTriggerType;
  triggeredBy?: string;
  triggeredByName?: string;
};

export async function createCrawlRun(
  input: CreateRunInput,
): Promise<string> {
  const db = getFirestore();
  const ref = await db.collection("crawlRuns").add({
    startedAt: FieldValue.serverTimestamp(),
    triggerType: input.triggerType,
    triggeredBy: input.triggeredBy ?? null,
    triggeredByName: input.triggeredByName ?? null,
    status: "RUNNING" as CrawlRunStatus,
    orgResults: [] as CrawlOrgResult[],
    totalNewDrafts: 0,
    totalErrors: 0,
  });
  logger.info("[crawlRun] created", {id: ref.id, trigger: input.triggerType});
  return ref.id;
}

// Append a per-org result. We use a transaction so concurrent updates from
// any future parallel scheduler can't drop entries.
export async function recordOrgResult(
  runId: string,
  result: CrawlOrgResult,
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("crawlRuns").doc(runId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) return;
    const data = snap.data() ?? {};
    const orgResults = Array.isArray(data.orgResults) ?
      [...(data.orgResults as CrawlOrgResult[])] :
      [];
    orgResults.push(result);
    txn.update(ref, {
      orgResults,
      totalNewDrafts: (data.totalNewDrafts ?? 0) + result.newItemsCreated,
      totalErrors: (data.totalErrors ?? 0) + (result.errorMessage ? 1 : 0),
    });
  });
}

export type FinishRunInput = {
  startedAtMs: number;
};

export async function finishCrawlRun(
  runId: string,
  input: FinishRunInput,
): Promise<{
  status: CrawlRunStatus;
  totalNewDrafts: number;
  totalErrors: number;
}> {
  const db = getFirestore();
  const ref = db.collection("crawlRuns").doc(runId);
  const snap = await ref.get();
  const data = snap.data() ?? {};
  const totalNew = (data.totalNewDrafts as number | undefined) ?? 0;
  const totalErrors = (data.totalErrors as number | undefined) ?? 0;
  const status: CrawlRunStatus =
    totalErrors === 0 ? "SUCCESS" :
      totalNew > 0 ? "PARTIAL" : "FAILED";

  const durationMs = Date.now() - input.startedAtMs;
  await ref.update({
    status,
    finishedAt: FieldValue.serverTimestamp(),
    durationMs,
  });

  // Also keep the legacy /_meta/lastPullRun pointer fresh — older dashboard
  // tiles still read it.
  try {
    await db.collection("_meta").doc("lastPullRun").set(
      {
        runId,
        status,
        totalNewDrafts: totalNew,
        totalErrors,
        durationMs,
        finishedAtTs: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  } catch (err) {
    logger.warn("[crawlRun] could not update _meta/lastPullRun", {err});
  }

  logger.info("[crawlRun] finished", {
    id: runId,
    status,
    totalNew,
    totalErrors,
    durationMs,
  });
  return {status, totalNewDrafts: totalNew, totalErrors};
}

// Apply per-org status updates to /organizations/{id}.crawlStatus. Called
// once per org-domain pair.
export async function updateOrgCrawlStatus(
  orgId: string,
  result: CrawlOrgResult,
  newSeenHashes: string[],
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("organizations").doc(orgId);
  const now = Timestamp.now();
  const update: Record<string, unknown> = {
    "crawlStatus.lastRunAt": now,
    "updatedAt": now,
  };
  if (result.errorMessage) {
    update["crawlStatus.lastError"] = result.errorMessage;
    update["crawlStatus.consecutiveFailures"] = FieldValue.increment(1);
  } else {
    update["crawlStatus.lastSuccessAt"] = now;
    update["crawlStatus.consecutiveFailures"] = 0;
    update["crawlStatus.lastError"] = FieldValue.delete();
    if (result.newItemsCreated > 0) {
      update["crawlStatus.totalCollected"] = FieldValue.increment(
        result.newItemsCreated,
      );
    }
  }
  // Cap seen-hash ring at 500 to keep doc size bounded.
  if (newSeenHashes.length > 0) {
    const snap = await ref.get();
    const existing = (snap.data()?.crawlStatus?.seenUrlHashes as
      | string[]
      | undefined) ?? [];
    const merged = Array.from(new Set([...existing, ...newSeenHashes]));
    const trimmed = merged.slice(-500);
    update["crawlStatus.seenUrlHashes"] = trimmed;
  }
  await ref.update(update);
}
