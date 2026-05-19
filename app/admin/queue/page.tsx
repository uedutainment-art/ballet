"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  approveCompetition,
  listByStatus,
} from "@/lib/firebase/admin-queries";
import { isAdminOrAbove } from "@/lib/types/user";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Competition } from "@/lib/types/competition";

export default function QueuePage() {
  const { user, userDoc } = useAuth();
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canApprove = isAdminOrAbove(userDoc?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const xs = await listByStatus("READY", 50);
      if (!cancelled) {
        setItems(xs);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function approve(id: string) {
    if (!user?.uid) return;
    setApproving(id);
    try {
      await approveCompetition(id, user.uid);
      setItems((prev) => prev.filter((c) => c.id !== id));
      setToast("공개됐어요");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error("[queue] approve failed:", err);
      setToast("승인에 실패했어요");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl relative">
      <header>
        <h1 className="text-2xl font-serif text-ink">승인 큐</h1>
        <p className="mt-1 text-sm text-warm-gray">
          승인 대기(READY) 상태 항목을 공개로 전환합니다
        </p>
      </header>

      {!canApprove ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
          승인 권한이 없어요. ADMIN 이상의 권한이 필요합니다.
        </div>
      ) : null}

      {loading ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-border rounded-md p-12 text-center text-sm text-warm-gray">
          승인 대기 중인 항목이 없어요
        </div>
      ) : (
        <ul className="bg-white border border-border rounded-md divide-y divide-border">
          {items.map((c) => (
            <li
              key={c.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <StatusBadge status={c.status} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink truncate">{c.name}</div>
                <div className="text-[11px] text-warm-gray truncate">
                  {c.host} · 수집 {formatDate(c.aiCollectedAt)}
                </div>
              </div>
              {canApprove ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => approve(c.id)}
                  disabled={approving === c.id}
                  className="shrink-0"
                >
                  {approving === c.id ? "처리 중…" : "공개 승인"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-xs px-4 py-2 rounded-sm shadow-lg z-50">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
