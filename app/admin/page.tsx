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
import type { EditLog } from "@/lib/types/editLog";

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
  const [recent, setRecent] = useState<EditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, u, r] = await Promise.all([
        countByStatus(),
        listUrgentPublished(3),
        listRecentEdits(5),
      ]);
      if (cancelled) return;
      setCounts(c);
      setUrgent(u);
      setRecent(r);
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
        {loading ? (
          <div className="bg-white border border-border rounded-md p-6 text-sm text-warm-gray">
            불러오는 중…
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-white border border-border rounded-md p-6 text-center text-sm text-warm-gray">
            아직 활동이 없어요
          </div>
        ) : (
          <ul className="bg-white border border-border rounded-md divide-y divide-border">
            {recent.map((log) => (
              <RecentActivityRow key={log.id} log={log} />
            ))}
          </ul>
        )}
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

const STATUS_LABELS_KO: Record<ContentStatus, string> = {
  DRAFT: "AI 1차",
  IN_REVIEW: "검수 중",
  READY: "승인 대기",
  PUBLISHED: "공개",
  ARCHIVED: "보관",
};

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(d);
}

function RecentActivityRow({ log }: { log: EditLog }) {
  const isStatusChange =
    log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus;
  const when = log.timestamp.toDate();
  const docPath = log.docRef.split("/")[1];

  return (
    <li className="px-4 py-3 flex items-center gap-3 text-sm">
      <span className="text-[11px] text-warm-gray shrink-0 w-16">
        {timeAgo(when)}
      </span>
      <span className="flex-1 truncate text-ink">
        <span className="font-medium">{log.userDisplayName}</span>
        <span className="text-warm-gray">님이</span>{" "}
        <Link
          href={`/admin/competitions/${docPath}`}
          className="hover:underline"
        >
          [{log.docTitle}]
        </Link>
        {isStatusChange ? (
          <>
            <span className="text-warm-gray">을 </span>
            <span className="font-medium">
              {STATUS_LABELS_KO[log.toStatus!]}
            </span>
            <span className="text-warm-gray">로 변경</span>
          </>
        ) : (
          <span className="text-warm-gray"> 필드 수정 ({log.changedFields.length})</span>
        )}
      </span>
    </li>
  );
}
