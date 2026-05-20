"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  countByStatusAdmissions,
  listAdmissionsByStatus,
} from "@/lib/firebase/admin-queries";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewDraftButton } from "@/components/admin/NewDraftButton";
import { Badge } from "@/components/ui/Badge";
import { SCHOOL_TYPE_LABELS, type Admission } from "@/lib/types/admission";
import type { ContentStatus } from "@/lib/types/status";
import { formatDate } from "@/lib/format";
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

export default function AdmissionsAdminPage() {
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
  const [items, setItems] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await countByStatusAdmissions();
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
      const xs = await listAdmissionsByStatus(active, 30);
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
    router.replace(`/admin/admissions?${next.toString()}`);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-ink">입시 검수</h1>
          <p className="mt-1 text-sm text-warm-gray">
            상태별로 입시 정보를 정리해 드려요
          </p>
        </div>
        <NewDraftButton domain="admission" />
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
                <th className="text-left px-4 py-2 text-xs font-normal">
                  학교 · 학과
                </th>
                <th className="text-left px-4 py-2 text-xs font-normal">
                  유형
                </th>
                <th className="text-left px-4 py-2 text-xs font-normal">
                  학년도
                </th>
                <th className="text-left px-4 py-2 text-xs font-normal">
                  접수마감
                </th>
                <th className="text-left px-4 py-2 text-xs font-normal">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-cream-start/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/admissions/${a.id}`}
                      className="text-ink hover:underline"
                    >
                      {a.schoolName}
                      <span className="text-warm-gray">
                        {" · "}
                        {a.department}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-warm-gray">
                    <Badge variant="default">
                      {SCHOOL_TYPE_LABELS[a.schoolType]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-warm-gray">{a.year}</td>
                  <td className="px-4 py-3 text-warm-gray text-xs">
                    {a.regEnd ? formatDate(a.regEnd) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
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
