"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { listInquiries } from "@/lib/firebase/admin-queries";
import { relativeTimeKo } from "@/lib/utils/relativeTime";
import {
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE_LABELS,
  INQUIRY_TYPE_ORDER,
  type Inquiry,
  type InquiryStatus,
  type InquiryType,
} from "@/lib/types/inquiry";
import { cn } from "@/lib/cn";

type StatusFilterKey = "open" | InquiryStatus | "all";

const STATUS_TABS: Array<{ key: StatusFilterKey; label: string }> = [
  { key: "open", label: "처리 필요" },
  { key: "NEW", label: "신규" },
  { key: "IN_PROGRESS", label: "처리 중" },
  { key: "DONE", label: "완료" },
  { key: "REJECTED", label: "거절" },
  { key: "all", label: "전체" },
];

export default function InquiriesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-warm-gray">로딩 중…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();

  const activeStatus = (sp.get("status") as StatusFilterKey | null) ?? "open";
  const activeType = (sp.get("type") as InquiryType | "all" | null) ?? "all";

  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const xs = await listInquiries({ limit: 200 });
      if (!cancelled) {
        setItems(xs);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    let xs = items;
    if (activeStatus === "open") {
      xs = xs.filter((i) => i.status === "NEW" || i.status === "IN_PROGRESS");
    } else if (activeStatus !== "all") {
      xs = xs.filter((i) => i.status === activeStatus);
    }
    if (activeType !== "all") {
      xs = xs.filter((i) => i.type === activeType);
    }
    return xs;
  }, [items, activeStatus, activeType]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    next.set(key, value);
    router.replace(`/admin/inquiries?${next.toString()}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-ink">제보 큐</h1>
        <p className="mt-1 text-sm text-warm-gray">
          외부에서 들어온 제보·수정·삭제 요청을 한곳에서 처리해요
        </p>
      </header>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const count =
            t.key === "open"
              ? items.filter(
                  (i) => i.status === "NEW" || i.status === "IN_PROGRESS",
                ).length
              : t.key === "all"
                ? items.length
                : items.filter((i) => i.status === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setParam("status", t.key)}
              className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeStatus === t.key
                  ? "border-brand text-ink"
                  : "border-transparent text-warm-gray hover:text-ink",
              )}
            >
              {t.label}{" "}
              <span className="ml-1 text-[10px] text-warm-gray">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-warm-gray">유형:</span>
        <FilterChip
          active={activeType === "all"}
          onClick={() => setParam("type", "all")}
        >
          전체
        </FilterChip>
        {INQUIRY_TYPE_ORDER.map((t) => (
          <FilterChip
            key={t}
            active={activeType === t}
            onClick={() => setParam("type", t)}
          >
            {INQUIRY_TYPE_LABELS[t]}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          불러오는 중…
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          조건에 맞는 제보가 없어요
        </div>
      ) : (
        <ul className="bg-white border border-border rounded-md divide-y divide-border overflow-hidden">
          {visible.map((i) => (
            <li key={i.id}>
              <Link
                href={`/admin/inquiries/${i.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-cream-start/30 transition-colors"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: INQUIRY_STATUS_COLORS[i.status] }}
                  title={INQUIRY_STATUS_LABELS[i.status]}
                />
                <span className="text-[10px] tracking-wider text-warm-gray uppercase w-24 shrink-0">
                  {INQUIRY_TYPE_LABELS[i.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{i.subject}</div>
                  <div className="text-[11px] text-warm-gray/80 truncate">
                    {i.email ?? "이메일 없음"}
                    {i.attachments.length > 0
                      ? ` · 📎 ${i.attachments.length}`
                      : ""}
                    {i.recaptchaScore != null
                      ? ` · 🛡 ${i.recaptchaScore.toFixed(2)}`
                      : ""}
                  </div>
                </div>
                <span className="text-[11px] text-warm-gray shrink-0">
                  {relativeTimeKo(i.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-1 rounded-sm border",
        active
          ? "bg-ink text-white border-ink"
          : "border-border text-warm-gray hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
