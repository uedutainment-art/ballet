"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getCrawlRunById } from "@/lib/firebase/admin-queries";
import { relativeTimeKo } from "@/lib/utils/relativeTime";
import type { CrawlRun, CrawlRunStatus } from "@/lib/types/crawlRun";
import { cn } from "@/lib/cn";

const STATUS_COLORS: Record<CrawlRunStatus, string> = {
  SUCCESS: "text-green-600",
  PARTIAL: "text-amber-600",
  FAILED: "text-red-600",
  RUNNING: "text-blue-600",
};
const STATUS_LABELS: Record<CrawlRunStatus, string> = {
  SUCCESS: "성공",
  PARTIAL: "부분 성공",
  FAILED: "실패",
  RUNNING: "진행 중",
};
const DOMAIN_LABELS: Record<string, string> = {
  competition: "콩쿠르",
  admission: "입시",
  performance: "공연",
};

export default function CrawlRunDetailPage() {
  const params = useParams() as { id: string };
  const [run, setRun] = useState<CrawlRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getCrawlRunById(params.id);
      if (!cancelled) {
        setRun(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return <div className="text-sm text-warm-gray">불러오는 중…</div>;
  }
  if (!run) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">실행 이력을 찾을 수 없어요</div>
        <Link
          href="/admin/crawl-runs"
          className="text-xs text-brand hover:underline"
        >
          ← 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-warm-gray">
        <Link href="/admin/crawl-runs" className="hover:text-ink">
          자동수집 이력
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink font-mono">{run.id}</span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-serif text-ink">
          <span className={cn("mr-2", STATUS_COLORS[run.status])}>
            ●
          </span>
          {STATUS_LABELS[run.status]}
        </h1>
        <p className="text-sm text-warm-gray">
          시작: {relativeTimeKo(run.startedAt)} · 트리거: {run.triggerType}
          {run.triggeredByName ? ` · ${run.triggeredByName}` : ""}
          {run.durationMs ? ` · ${Math.round(run.durationMs / 100) / 10}s` : ""}
        </p>
        <div className="text-sm text-ink">
          신규 DRAFT: <strong>{run.totalNewDrafts}</strong>건 · 오류:{" "}
          <strong className={cn(run.totalErrors > 0 && "text-red-600")}>
            {run.totalErrors}
          </strong>
          건
        </div>
      </header>

      <section className="bg-white border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-start/40 text-warm-gray">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-normal">기관</th>
              <th className="text-left px-3 py-2 text-xs font-normal">도메인</th>
              <th className="text-right px-3 py-2 text-xs font-normal">발견</th>
              <th className="text-right px-3 py-2 text-xs font-normal">신규</th>
              <th className="text-right px-3 py-2 text-xs font-normal">중복</th>
              <th className="text-right px-3 py-2 text-xs font-normal">AI 호출</th>
              <th className="text-right px-3 py-2 text-xs font-normal">소요</th>
              <th className="text-left px-3 py-2 text-xs font-normal">오류</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(run.orgResults ?? []).map((r, i) => (
              <tr key={`${r.orgId}-${r.domain}-${i}`} className="hover:bg-cream-start/20">
                <td className="px-3 py-2 text-xs">
                  <Link
                    href={`/admin/organizations/${r.orgId}`}
                    className="text-ink hover:underline"
                  >
                    {r.orgName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-warm-gray">
                  {DOMAIN_LABELS[r.domain] ?? r.domain}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right">
                  {r.urlsFetched}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right text-ink">
                  {r.newItemsCreated}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right text-warm-gray">
                  {r.skippedDuplicates}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right text-warm-gray">
                  {r.aiCallsUsed}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-right text-warm-gray">
                  {Math.round(r.durationMs / 100) / 10}s
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.errorMessage ? (
                    <details>
                      <summary className="text-red-600 cursor-pointer inline-flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        오류
                      </summary>
                      <pre className="mt-2 bg-red-50 text-red-700 p-2 rounded-sm whitespace-pre-wrap break-all text-[10px]">
                        {r.errorMessage}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-warm-gray/60">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {(run.orgResults ?? []).some((r) => r.sampleUrls && r.sampleUrls.length > 0) ? (
        <section className="bg-white border border-border rounded-md p-4 space-y-2">
          <div className="text-xs tracking-wider text-warm-gray uppercase">
            샘플 URL (이번 실행에서 새로 만든 DRAFT의 원본)
          </div>
          <ul className="text-xs space-y-1">
            {(run.orgResults ?? []).flatMap((r) =>
              (r.sampleUrls ?? []).map((u) => (
                <li key={u} className="flex items-center gap-2 text-warm-gray">
                  <span className="text-[10px] text-warm-gray/70 w-24 truncate">
                    {r.orgName}
                  </span>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline truncate"
                  >
                    {u}
                  </a>
                </li>
              )),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
