// Top-level runner used by both the scheduled trigger and manual all-orgs
// trigger. Walks all crawlEnabled organizations, dispatches to runCrawlForOrg
// per domain board URL, and books everything against a single CrawlRun.

import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {
  createCrawlRun,
  finishCrawlRun,
  recordOrgResult,
  updateOrgCrawlStatus,
  type CrawlDomain,
  type CrawlTriggerType,
} from "./crawlRun";
import {runCrawlForOrg} from "./orgCrawler";

const DOMAINS: Array<{
  domain: CrawlDomain;
  field: "competitionBoardUrl" | "admissionBoardUrl" | "performanceBoardUrl";
}> = [
  {domain: "competition", field: "competitionBoardUrl"},
  {domain: "admission", field: "admissionBoardUrl"},
  {domain: "performance", field: "performanceBoardUrl"},
];

export type RunAllParams = {
  triggerType: CrawlTriggerType;
  triggeredBy?: string;
  triggeredByName?: string;
  apiKey: string;
  // Optional whitelist of org IDs (for MANUAL_ORG case the runner can pass
  // a single-id list and reuse the same plumbing).
  onlyOrgIds?: string[];
};

export async function runAllCrawls(params: RunAllParams): Promise<{
  runId: string;
  totalNewDrafts: number;
  totalErrors: number;
}> {
  const startedAtMs = Date.now();
  const db = getFirestore();
  const runId = await createCrawlRun({
    triggerType: params.triggerType,
    triggeredBy: params.triggeredBy,
    triggeredByName: params.triggeredByName,
  });

  // Resolve candidate orgs.
  let snap;
  if (params.onlyOrgIds && params.onlyOrgIds.length > 0) {
    const docs = await Promise.all(
      params.onlyOrgIds.map((id) =>
        db.collection("organizations").doc(id).get(),
      ),
    );
    snap = {docs: docs.filter((d) => d.exists)};
  } else {
    const q = await db
      .collection("organizations")
      .where("crawlEnabled", "==", true)
      .where("status", "==", "ACTIVE")
      .get();
    snap = {docs: q.docs};
  }

  logger.info("[runner] starting", {
    runId,
    orgCount: snap.docs.length,
    trigger: params.triggerType,
  });

  for (const orgDoc of snap.docs) {
    const org = orgDoc.data() ?? {};
    if (org.crawlEnabled !== true && !params.onlyOrgIds) {
      // Safety: the where clause already filters this but keep belt + braces.
      continue;
    }
    const cfg = (org.crawlConfig ?? {}) as Record<string, unknown>;
    const seenHashes = (org.crawlStatus?.seenUrlHashes as string[] | undefined) ?? [];

    for (const {domain, field} of DOMAINS) {
      const boardUrl = cfg[field] as string | undefined;
      if (!boardUrl || typeof boardUrl !== "string" || !boardUrl.trim()) continue;

      const {result, newSeenHashes} = await runCrawlForOrg({
        runId,
        orgId: orgDoc.id,
        orgName: (org.name as string | undefined) ?? orgDoc.id,
        domain,
        boardUrl: boardUrl.trim(),
        excludePattern: cfg.excludeUrlPattern as string | undefined,
        userAgent: cfg.userAgent as string | undefined,
        seenHashes,
        apiKey: params.apiKey,
      });

      await recordOrgResult(runId, result);
      await updateOrgCrawlStatus(orgDoc.id, result, newSeenHashes);
    }
  }

  const finished = await finishCrawlRun(runId, {startedAtMs});
  return {
    runId,
    totalNewDrafts: finished.totalNewDrafts,
    totalErrors: finished.totalErrors,
  };
}
