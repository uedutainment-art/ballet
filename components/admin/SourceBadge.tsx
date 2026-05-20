import Link from "next/link";
import type { Timestamp } from "firebase/firestore";
import { relativeTimeKo } from "@/lib/utils/relativeTime";

// Compact provenance chip for DRAFT cards. Three flavors:
//   - automated crawl (crawlMeta populated)
//   - submitter form (anonymous /submit + source === "push")
//   - manual editor entry (default)
//
// All flavors share the same visual budget — small, single-line, click-through
// to the source URL when one exists.

type CrawlMetaLike = {
  sourceOrgName?: string;
  sourceUrl?: string;
  fetchedAt?: Timestamp;
};

type Props = {
  crawlMeta?: CrawlMetaLike;
  source?: "pull" | "push" | "manual";
};

export function SourceBadge({ crawlMeta, source }: Props) {
  if (crawlMeta?.sourceOrgName) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-cream-start/60 border border-border rounded-sm px-1.5 py-0.5">
        <span className="text-warm-gray">🤖</span>
        <span className="text-ink truncate max-w-[180px]" title={crawlMeta.sourceOrgName}>
          {crawlMeta.sourceOrgName}
        </span>
        {crawlMeta.fetchedAt ? (
          <span className="text-warm-gray">
            · {relativeTimeKo(crawlMeta.fetchedAt)}
          </span>
        ) : null}
        {crawlMeta.sourceUrl ? (
          <Link
            href={crawlMeta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline ml-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            원문↗
          </Link>
        ) : null}
      </span>
    );
  }
  if (source === "push") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-cream-start/60 border border-border rounded-sm px-1.5 py-0.5">
        <span className="text-warm-gray">📮</span>
        <span className="text-ink">익명 제보</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-warm-gray/70 border border-border rounded-sm px-1.5 py-0.5">
      <span>✏</span>
      <span>수동 입력</span>
    </span>
  );
}

// Filter key used by the queue dropdown.
export type SourceFilterKey = "all" | "pull" | "push" | "manual";

export function matchesSourceFilter(
  filter: SourceFilterKey,
  item: { source?: "pull" | "push" | "manual"; crawlMeta?: CrawlMetaLike },
): boolean {
  if (filter === "all") return true;
  if (filter === "pull") return Boolean(item.crawlMeta) || item.source === "pull";
  if (filter === "push") return item.source === "push";
  return !item.crawlMeta && item.source !== "pull" && item.source !== "push";
}
