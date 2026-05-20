"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  countByStatusVideos,
  listVideosByStatus,
} from "@/lib/firebase/admin-queries";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewDraftButton } from "@/components/admin/NewDraftButton";
import {
  LEVEL_LABELS,
  SERIES_LABELS,
  type Video,
} from "@/lib/types/video";
import type { ContentStatus } from "@/lib/types/status";
import { formatDuration } from "@/lib/utils/youtube";
import { cn } from "@/lib/cn";

const TABS: Array<{ key: ContentStatus; label: string; param: string }> = [
  { key: "DRAFT", label: "AI 1차", param: "draft" },
  { key: "IN_REVIEW", label: "검수 중", param: "in_review" },
  { key: "READY", label: "승인 대기", param: "ready" },
  { key: "PUBLISHED", label: "공개", param: "published" },
  { key: "ARCHIVED", label: "보관", param: "archived" },
];

const EMPTY_COUNTS: Record<ContentStatus, number> = {
  DRAFT: 0,
  IN_REVIEW: 0,
  READY: 0,
  PUBLISHED: 0,
  ARCHIVED: 0,
};

function paramToStatus(param: string | null): ContentStatus {
  const found = TABS.find((t) => t.param === param);
  return found ? found.key : "DRAFT";
}

export default function VideosAdminPage() {
  return (
    <Suspense fallback={<div className="text-sm text-warm-gray">로딩 중…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const active = paramToStatus(sp.get("status"));

  const [counts, setCounts] =
    useState<Record<ContentStatus, number>>(EMPTY_COUNTS);
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await countByStatusVideos();
      if (!cancelled) setCounts(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const xs = await listVideosByStatus(active, 30);
      if (!cancelled) {
        setItems(xs);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  function go(param: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("status", param);
    router.replace(`/admin/videos?${next.toString()}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-ink">영상 검수</h1>
          <p className="mt-1 text-sm text-warm-gray">
            상태별로 영상 컨텐츠를 정리해 드려요
          </p>
        </div>
        <NewDraftButton domain="video" />
      </header>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => go(t.param)}
            className={cn(
              "px-3 py-2 text-sm border-b-2 transition-colors -mb-px whitespace-nowrap",
              active === t.key
                ? "border-brand text-ink"
                : "border-transparent text-warm-gray hover:text-ink",
            )}
          >
            {t.label}{" "}
            <span className="ml-1 text-[10px] text-warm-gray">
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          이 탭에는 항목이 없어요
        </div>
      ) : (
        <div className="bg-white border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-start/40 text-warm-gray">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-normal">제목</th>
                <th className="text-left px-4 py-2 text-xs font-normal">시리즈</th>
                <th className="text-left px-4 py-2 text-xs font-normal">레벨</th>
                <th className="text-left px-4 py-2 text-xs font-normal">길이</th>
                <th className="text-left px-4 py-2 text-xs font-normal">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-cream-start/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/videos/${v.id}`}
                      className="text-ink hover:underline"
                    >
                      {v.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-warm-gray">
                    {SERIES_LABELS[v.series]}
                  </td>
                  <td className="px-4 py-3 text-warm-gray text-xs">
                    {v.level ? LEVEL_LABELS[v.level] : "—"}
                  </td>
                  <td className="px-4 py-3 text-warm-gray text-xs font-mono">
                    {formatDuration(v.durationSeconds) || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
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
