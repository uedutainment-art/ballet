import type { Timestamp } from "firebase/firestore";

// M11: a single execution of the pull crawler. Created at run start, updated
// per-org as work completes, finalized when the whole pass finishes. Provides
// the audit trail behind /admin/crawl-runs.

export type CrawlRunStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "RUNNING";

export type CrawlTriggerType =
  | "SCHEDULED"
  | "MANUAL_ORG"
  | "MANUAL_ALL";

export type CrawlDomain = "competition" | "admission" | "performance";

export interface CrawlOrgResult {
  orgId: string;
  orgName: string;
  domain: CrawlDomain;
  boardUrl: string;
  urlsFetched: number;        // # of links found on the board page
  newItemsCreated: number;    // DRAFT docs created
  skippedDuplicates: number;  // URLs already seen
  aiCallsUsed: number;        // OpenAI calls made for this org
  durationMs: number;
  errorMessage?: string;
  // The fully resolved article URLs we acted on this run. Helpful when
  // debugging "왜 안 잡혔지?" — operator can compare expectations.
  sampleUrls?: string[];
}

export interface CrawlRun {
  id: string;
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  triggerType: CrawlTriggerType;
  triggeredBy?: string;     // userId when MANUAL_*
  triggeredByName?: string;
  status: CrawlRunStatus;
  orgResults: CrawlOrgResult[];
  totalNewDrafts: number;
  totalErrors: number;
  durationMs?: number;
}

// Convenience: a minimal pointer to the originating crawl, embedded on every
// DRAFT created by the crawler. Keeps the audit trail visible from inside the
// content editor without needing a join.
export interface CrawlMeta {
  crawlRunId: string;
  sourceOrgId: string;
  sourceOrgName: string;
  sourceUrl: string;
  fetchedAt: Timestamp;
}
