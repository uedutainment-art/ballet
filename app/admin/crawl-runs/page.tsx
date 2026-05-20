"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  TriangleAlert,
} from "lucide-react";
import { functions } from "@/lib/firebase/client";
import { listRecentCrawlRuns } from "@/lib/firebase/admin-queries";
import { useAuth } from "@/components/providers/AuthProvider";
import { isAdminOrAbove } from "@/lib/types/user";
import { Button } from "@/components/ui/Button";
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
  PARTIAL: "부분",
  FAILED: "실패",
  RUNNING: "진행 중",
};

const TRIGGER_LABELS: Record<string, string> = {
  SCHEDULED: "자동",
  MANUAL_ORG: "수동(개별)",
  MANUAL_ALL: "수동(전체)",
};

export default function CrawlRunsPage() {
  const { userDoc } = useAuth();
  const canTriggerAll = isAdminOrAbove(userDoc?.role);

  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const xs = await listRecentCrawlRuns(30);
    setRuns(xs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTriggerAll() {
    if (
      !confirm(
        "활성화된 모든 기관에 대해 즉시 크롤을 실행할까요? AI 비용이 발생해요.",
      )
    ) {
      return;
    }
    setTriggering(true);
    setFeedback(null);
    try {
      const callable = httpsCallable<
        Record<string, never>,
        { runId: string; totalNewDrafts: number; totalErrors: number }
      >(functions, "pullCrawlerManual");
      const res = await callable({});
      setFeedback(
        `완료 · 신규 DRAFT ${res.data.totalNewDrafts}건${res.data.totalErrors > 0 ? ` · 오류 ${res.data.totalErrors}` : ""}`,
      );
      void load();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "실행에 실패했어요");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-ink">자동수집 실행 이력</h1>
          <p className="mt-1 text-sm text-warm-gray">
            매주 월요일 08:00 KST 자동 실행 + 수동 트리거 결과를 확인할 수 있어요
          </p>
        </div>
        {canTriggerAll ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleTriggerAll}
            disabled={triggering}
          >
            {triggering ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                실행 중…
              </>
            ) : (
              <>
                <Play className="size-4 mr-1.5" />
                지금 전체 크롤
              </>
            )}
          </Button>
        ) : null}
      </header>

      {feedback ? (
        <div className="bg-cream-start/40 border border-border rounded-sm px-3 py-2 text-xs">
          {feedback}
        </div>
      ) : null}

      {loading ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          불러오는 중…
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          실행 이력이 없어요. &ldquo;지금 전체 크롤&rdquo;을 눌러 1회 실행해 볼 수 있어요.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-start/40 text-warm-gray">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-normal">시작</th>
                <th className="text-left px-3 py-2 text-xs font-normal">상태</th>
                <th className="text-left px-3 py-2 text-xs font-normal">트리거</th>
                <th className="text-right px-3 py-2 text-xs font-normal">기관</th>
                <th className="text-right px-3 py-2 text-xs font-normal">신규</th>
                <th className="text-right px-3 py-2 text-xs font-normal">오류</th>
                <th className="text-right px-3 py-2 text-xs font-normal">소요</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-cream-start/20">
                  <td className="px-3 py-2 text-xs">
                    <Link
                      href={`/admin/crawl-runs/${r.id}`}
                      className="text-ink hover:underline"
                    >
                      {relativeTimeKo(r.startedAt)}
                    </Link>
                  </td>
                  <td className={cn("px-3 py-2 text-xs", STATUS_COLORS[r.status])}>
                    <span className="inline-flex items-center gap-1">
                      <StatusIcon status={r.status} />
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-warm-gray">
                    {TRIGGER_LABELS[r.triggerType] ?? r.triggerType}
                    {r.triggeredByName ? (
                      <span className="text-warm-gray/70"> · {r.triggeredByName}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-warm-gray text-right font-mono">
                    {r.orgResults?.length ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink text-right font-mono">
                    {r.totalNewDrafts ?? 0}
                  </td>
                  <td className={cn(
                    "px-3 py-2 text-xs text-right font-mono",
                    (r.totalErrors ?? 0) > 0 ? "text-red-600" : "text-warm-gray",
                  )}>
                    {r.totalErrors ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs text-warm-gray text-right font-mono">
                    {r.durationMs ? `${Math.round(r.durationMs / 100) / 10}s` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: CrawlRunStatus }) {
  if (status === "SUCCESS") return <CheckCircle2 className="size-3.5" />;
  if (status === "PARTIAL") return <TriangleAlert className="size-3.5" />;
  if (status === "FAILED") return <AlertTriangle className="size-3.5" />;
  return <Loader2 className="size-3.5 animate-spin" />;
}
