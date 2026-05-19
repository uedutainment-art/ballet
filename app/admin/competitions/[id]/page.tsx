"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCompetitionById } from "@/lib/firebase/queries";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { Competition } from "@/lib/types/competition";

// Placeholder. The full side-by-side diff editor (AI suggestion vs. editor
// draft, field-by-field accept/reject) lands in T5.

export default function AdminCompetitionDetail() {
  const params = useParams() as { id: string };
  const [c, setC] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getCompetitionById(params.id);
      if (!cancelled) {
        setC(data);
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
  if (!c) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/competitions"
          className="text-xs text-brand hover:underline"
        >
          ← 검수 큐로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="text-xs text-warm-gray">
        <Link href="/admin/competitions" className="hover:text-ink">
          콩쿠르 검수
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{c.name}</span>
      </nav>

      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-serif text-ink">{c.name}</h1>
        <StatusBadge status={c.status} />
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
        ★ 좌우 비교 편집기는 다음 작업(T5)에서 구현됩니다. 지금은 데이터
        확인용으로 전체 필드를 그대로 보여드려요.
      </div>

      <pre className="bg-white border border-border rounded-md p-4 text-[11px] overflow-x-auto text-ink whitespace-pre-wrap">
        {JSON.stringify(c, null, 2)}
      </pre>
    </div>
  );
}
