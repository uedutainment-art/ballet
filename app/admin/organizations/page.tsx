"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Plus, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase/client";
import {
  countByStatusOrganizations,
  listOrganizationsByStatus,
} from "@/lib/firebase/admin-queries";
import { HealthDot } from "@/components/admin/HealthDot";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { BulkAddOrgsModal } from "@/components/admin/BulkAddOrgsModal";
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  type Organization,
  type OrgType,
} from "@/lib/types/organization";
import { computeHealth, HEALTH_LABELS, type HealthLevel } from "@/lib/organization/health";
import { relativeTimeKo } from "@/lib/utils/relativeTime";
import type { ContentStatus } from "@/lib/types/status";
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

export default function OrgsAdminPage() {
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
  const { user } = useAuth();

  const [counts, setCounts] =
    useState<Record<ContentStatus, number>>(EMPTY_COUNTS);
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<OrgType | "all">("all");
  const [healthFilter, setHealthFilter] = useState<HealthLevel | "all">("all");
  const [crawlOnly, setCrawlOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await countByStatusOrganizations();
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
      const xs = await listOrganizationsByStatus(active, 60);
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
    router.replace(`/admin/organizations?${next.toString()}`);
  }

  async function createBlank() {
    if (!user?.uid) return;
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "organizations"), {
        name: "(이름 미설정)",
        type: "OTHER",
        aliases: [],
        tags: [],
        status: "ACTIVE",
        workflowState: "DRAFT",
        source: "manual",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      });
      router.push(`/admin/organizations/${ref.id}`);
    } finally {
      setBusy(false);
    }
  }

  let visible = typeFilter === "all" ? items : items.filter((o) => o.type === typeFilter);
  if (crawlOnly) visible = visible.filter((o) => o.crawlEnabled === true);
  if (healthFilter !== "all") {
    visible = visible.filter((o) => computeHealth(o) === healthFilter);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-ink">기관 데이터베이스</h1>
          <p className="mt-1 text-sm text-warm-gray">
            대학·예고·예중·발레단·협회·공연장 마스터 정보를 한곳에서 관리해요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBulkOpen(true)}
            disabled={busy}
          >
            <Sparkles className="size-4 mr-1.5" />
            URL 일괄 추가
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={createBlank}
            disabled={busy}
          >
            <Plus className="size-4 mr-1.5" />
            신규 등록
          </Button>
        </div>
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

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-warm-gray">유형 필터:</span>
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-2 py-1 rounded-sm border",
              typeFilter === "all"
                ? "bg-ink text-white border-ink"
                : "border-border text-warm-gray hover:text-ink",
            )}
          >
            전체
          </button>
          {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2 py-1 rounded-sm border",
                typeFilter === t
                  ? "bg-ink text-white border-ink"
                  : "border-border text-warm-gray hover:text-ink",
              )}
            >
              {ORG_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={crawlOnly}
              onChange={(e) => setCrawlOnly(e.target.checked)}
              className="accent-brand"
            />
            <span className="text-warm-gray">자동수집 활성화만</span>
          </label>
          <span className="text-warm-gray">신호등:</span>
          {(["all", "GREEN", "YELLOW", "RED", "INACTIVE"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHealthFilter(h)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-sm border",
                healthFilter === h
                  ? "bg-ink text-white border-ink"
                  : "border-border text-warm-gray hover:text-ink",
              )}
            >
              {h !== "all" ? <HealthDot level={h} size={8} /> : null}
              {h === "all" ? "전체" : HEALTH_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          불러오는 중…
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          이 탭에는 항목이 없어요
        </div>
      ) : (
        <div className="bg-white border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-start/40 text-warm-gray">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-normal w-12"></th>
                <th className="text-left px-3 py-2 text-xs font-normal">이름</th>
                <th className="text-left px-3 py-2 text-xs font-normal">유형</th>
                <th className="text-left px-3 py-2 text-xs font-normal">지역</th>
                <th className="text-left px-3 py-2 text-xs font-normal">크롤</th>
                <th className="text-left px-3 py-2 text-xs font-normal">최근 실행</th>
                <th className="text-right px-3 py-2 text-xs font-normal">누적</th>
                <th className="text-left px-3 py-2 text-xs font-normal">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((o) => {
                const health = computeHealth(o);
                return (
                  <tr key={o.id} className="hover:bg-cream-start/20">
                    <td className="px-3 py-2">
                      <OrgLogoChip
                        logoUrl={o.logoUrl}
                        name={o.name}
                        type={o.type}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/organizations/${o.id}`}
                        className="text-ink hover:underline"
                      >
                        {o.name}
                      </Link>
                      {o.shortName ? (
                        <div className="text-[10px] text-warm-gray/70 mt-0.5">
                          {o.shortName}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-warm-gray text-xs">
                      {ORG_TYPE_LABELS[o.type]}
                    </td>
                    <td className="px-3 py-3 text-warm-gray text-xs">
                      {o.region ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <HealthDot level={health} />
                        <span className="text-[10px] text-warm-gray">
                          {HEALTH_LABELS[health]}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-warm-gray text-xs">
                      {o.crawlEnabled
                        ? relativeTimeKo(o.crawlStatus?.lastRunAt)
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-warm-gray text-xs font-mono text-right">
                      {o.crawlStatus?.totalCollected ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={o.workflowState} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulkOpen ? (
        <BulkAddOrgsModal
          onClose={() => setBulkOpen(false)}
          onCreated={() => {
            setBulkOpen(false);
            // refresh counts + items
            countByStatusOrganizations().then(setCounts);
            listOrganizationsByStatus(active, 60).then(setItems);
          }}
        />
      ) : null}
    </div>
  );
}

function OrgLogoChip({
  logoUrl,
  name,
  type,
}: {
  logoUrl?: string;
  name: string;
  type: OrgType;
}) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <div className="relative w-8 h-8 rounded-sm overflow-hidden border border-border bg-white">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium"
          style={{ backgroundColor: ORG_TYPE_COLORS[type] }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
