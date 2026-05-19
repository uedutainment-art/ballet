"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  countByStatus,
  listRecentEdits,
  listUrgentPublished,
} from "@/lib/firebase/admin-queries";
import { DDayBadge } from "@/components/public/DDayBadge";
import { formatDate, toDate } from "@/lib/format";
import type { Competition } from "@/lib/types/competition";
import type { ContentStatus } from "@/lib/types/status";

const EMPTY_COUNTS: Record<ContentStatus, number> = {
  DRAFT: 0,
  IN_REVIEW: 0,
  READY: 0,
  PUBLISHED: 0,
  ARCHIVED: 0,
};

export default function AdminDashboard() {
  const { userDoc } = useAuth();
  const [counts, setCounts] = useState<Record<ContentStatus, number>>(EMPTY_COUNTS);
  const [urgent, setUrgent] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, u] = await Promise.all([
        countByStatus(),
        listUrgentPublished(3),
        listRecentEdits(5),
      ]);
      if (cancelled) return;
      setCounts(c);
      setUrgent(u);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-2xl font-serif text-ink">
          안녕하세요, {userDoc?.displayName ?? "—"}님
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          오늘 검수해야 할 콘텐츠를 한눈에 정리해 드려요
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <CountTile
          label="AI 1차"
          value={counts.DRAFT}
          href="/admin/competitions?status=draft"
          loading={loading}
        />
        <CountTile
          label="검수 중"
          value={counts.IN_REVIEW}
          href="/admin/competitions?status=in_review"
          loading={loading}
        />
        <CountTile
          label="승인 대기"
          value={counts.READY}
          href="/admin/queue"
          loading={loading}
        />
        <CountTile
          label="공개"
          value={counts.PUBLISHED}
          href="/admin/competitions?status=published"
          loading={loading}
        />
        <CountTile
          label="신고"
          value={0}
          href="#"
          loading={loading}
          disabled
        />
      </div>

      <section>
        <h2 className="text-sm font-medium text-ink mb-3">최근 검수 활동</h2>
        <div className="bg-white border border-border rounded-md p-6 text-center text-sm text-warm-gray">
          아직 활동이 없어요 · editLogs는 T5에서 자동 기록됩니다
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-ink mb-3">
          곧 마감되는 공개 대회
        </h2>
        {loading ? (
          <div className="bg-white border border-border rounded-md p-6 text-sm text-warm-gray">
            불러오는 중…
          </div>
        ) : urgent.length === 0 ? (
          <div className="bg-white border border-border rounded-md p-6 text-center text-sm text-warm-gray">
            2주 이내 마감되는 공개 대회가 없어요
          </div>
        ) : (
          <ul className="bg-white border border-border rounded-md divide-y divide-border">
            {urgent.map((c) => {
              const end = toDate(c.registrationEnd);
              const verified = toDate(c.lastVerifiedAt);
              return (
                <li
                  key={c.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  {end ? <DDayBadge date={end} /> : null}
                  <Link
                    href={`/admin/competitions/${c.id}`}
                    className="flex-1 text-sm text-ink hover:underline truncate"
                  >
                    {c.name}
                  </Link>
                  <span className="text-[11px] text-warm-gray shrink-0">
                    마지막 확인 {verified ? formatDate(verified) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CountTile({
  label,
  value,
  href,
  loading,
  disabled,
}: {
  label: string;
  value: number;
  href: string;
  loading: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <div className="text-xs text-warm-gray">{label}</div>
      <div className="mt-2 text-2xl font-serif text-ink">
        {loading ? "…" : value}
      </div>
    </>
  );
  if (disabled) {
    return (
      <div className="bg-white border border-border rounded-md p-4 opacity-50 cursor-not-allowed">
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="block bg-white border border-border rounded-md p-4 transition-transform hover:-translate-y-px"
    >
      {content}
    </Link>
  );
}
