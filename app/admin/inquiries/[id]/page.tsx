"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Paperclip,
  Send,
} from "lucide-react";
import { db } from "@/lib/firebase/client";
import { getInquiryById } from "@/lib/firebase/admin-queries";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { relativeTimeKo } from "@/lib/utils/relativeTime";
import {
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE_LABELS,
  type Inquiry,
  type InquiryContentDomain,
  type InquiryStatus,
} from "@/lib/types/inquiry";
import { cn } from "@/lib/cn";

type DomainChoice = InquiryContentDomain;

const DOMAIN_LABELS: Record<DomainChoice, string> = {
  competition: "콩쿠르",
  admission: "입시",
  performance: "공연",
  video: "영상",
  organization: "기관",
};

const COLLECTION_BY_DOMAIN: Record<DomainChoice, string> = {
  competition: "competitions",
  admission: "admissions",
  performance: "performances",
  video: "videos",
  organization: "organizations",
};

export default function InquiryDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const fresh = await getInquiryById(params.id);
    setInquiry(fresh);
    setNote(fresh?.resolution ?? "");
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = await getInquiryById(params.id);
      if (cancelled) return;
      setInquiry(fresh);
      setNote(fresh?.resolution ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function updateInquiry(patch: Record<string, unknown>) {
    if (!inquiry || !user?.uid) return;
    await updateDoc(doc(db, "inquiries", inquiry.id), {
      ...patch,
      updatedAt: serverTimestamp(),
      assignedTo: user.uid,
    });
    await refresh();
  }

  async function changeStatus(next: InquiryStatus) {
    if (!inquiry) return;
    setBusy(`status:${next}`);
    try {
      const patch: Record<string, unknown> = {status: next};
      if (next === "DONE" || next === "REJECTED") {
        patch.resolvedAt = serverTimestamp();
      }
      await updateInquiry(patch);
      showToast(`상태를 "${INQUIRY_STATUS_LABELS[next]}"로 바꿨어요`);
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    if (!inquiry) return;
    setBusy("note");
    try {
      await updateInquiry({resolution: note});
      showToast("처리 노트를 저장했어요");
    } finally {
      setBusy(null);
    }
  }

  async function convertToDraft(domain: DomainChoice) {
    if (!inquiry || !user?.uid) return;
    setBusy(`convert:${domain}`);
    try {
      const collectionName = COLLECTION_BY_DOMAIN[domain];
      const att = inquiry.attachments[0];
      const fetchedAt = Timestamp.now();

      // Build a minimal DRAFT with the inquiry as provenance. The editor
      // then runs AI re-extract from the attachment URL via the existing
      // SourcePane flow.
      const draftPayload: Record<string, unknown> = {
        status: "DRAFT",
        source: "manual",
        aiCollectedAt: fetchedAt,
        notes: `제보 ${inquiry.id.slice(0, 8)}에서 변환됨\n\n${inquiry.message}`,
        crawlMeta: {
          crawlRunId: "inquiry",
          sourceOrgId: "external",
          sourceOrgName: "외부 제보",
          sourceUrl: att?.storageUrl ?? "",
          fetchedAt,
        },
      };

      // Domain-specific required fields filled with sensible defaults.
      if (domain === "competition") {
        draftPayload.name = inquiry.subject;
        draftPayload.host = "(미설정 — 검수 필요)";
        draftPayload.venue = "";
        draftPayload.category = "domestic_general";
        draftPayload.sections = [];
        draftPayload.ageGroups = [];
        draftPayload.officialUrl = "";
      } else if (domain === "admission") {
        draftPayload.schoolName = inquiry.subject;
        draftPayload.department = "발레전공";
        draftPayload.schoolType = "university";
        draftPayload.year = new Date().getFullYear() + 1;
        draftPayload.subjects = [];
        draftPayload.csat = "not_reflected";
        draftPayload.bonusCompetitions = [];
      } else if (domain === "performance") {
        draftPayload.title = inquiry.subject;
        draftPayload.company = "(미설정 — 검수 필요)";
        draftPayload.venue = "";
        draftPayload.showtimes = [];
        draftPayload.officialUrl = "";
      } else if (domain === "video") {
        draftPayload.title = inquiry.subject;
        draftPayload.youtubeUrl = "";
        draftPayload.youtubeId = "";
        draftPayload.thumbnailUrl = "";
        draftPayload.series = "other";
        draftPayload.type = "long";
        draftPayload.relatedCompetitionIds = [];
        draftPayload.relatedAdmissionIds = [];
        draftPayload.relatedPerformanceIds = [];
      } else if (domain === "organization") {
        draftPayload.name = inquiry.subject;
        draftPayload.type = "OTHER";
        draftPayload.aliases = [];
        draftPayload.tags = [];
        draftPayload.status = "ACTIVE";
        draftPayload.workflowState = "DRAFT";
        draftPayload.createdAt = fetchedAt;
        draftPayload.updatedAt = fetchedAt;
        draftPayload.createdBy = user.uid;
      }

      const ref = await addDoc(collection(db, collectionName), draftPayload);

      await updateInquiry({
        linkedDraftId: ref.id,
        status: "IN_PROGRESS",
        resolution:
          (note ? note + "\n" : "") +
          `DRAFT 생성됨 → /admin/${collectionName}/${ref.id}`,
      });

      router.push(`/admin/${collectionName}/${ref.id}`);
    } catch (err) {
      console.error("[inquiry] convertToDraft failed:", err);
      showToast(err instanceof Error ? err.message : "변환에 실패했어요");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-warm-gray">불러오는 중…</div>;
  }
  if (!inquiry) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">제보를 찾을 수 없어요</div>
        <Link
          href="/admin/inquiries"
          className="text-xs text-brand hover:underline"
        >
          ← 큐로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="text-xs text-warm-gray">
        <Link href="/admin/inquiries" className="hover:text-ink">
          제보 큐
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{inquiry.subject}</span>
      </nav>

      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] tracking-wider text-warm-gray uppercase">
            {INQUIRY_TYPE_LABELS[inquiry.type]}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-sm border border-border"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: INQUIRY_STATUS_COLORS[inquiry.status] }}
            />
            {INQUIRY_STATUS_LABELS[inquiry.status]}
          </span>
        </div>
        <h1 className="text-xl font-serif text-ink leading-tight">
          {inquiry.subject}
        </h1>
      </header>

      <section className="bg-white border border-border rounded-md p-5 space-y-4">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          제보 내용
        </div>
        <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
          {inquiry.message}
        </div>

        {inquiry.attachments.length > 0 ? (
          <div className="border-t border-border pt-3">
            <div className="text-xs tracking-wider text-warm-gray uppercase mb-2">
              첨부
            </div>
            <ul className="space-y-1">
              {inquiry.attachments.map((a) => (
                <li
                  key={a.storageUrl}
                  className="flex items-center gap-2 text-xs"
                >
                  <Paperclip className="size-3.5 text-warm-gray" />
                  <a
                    href={a.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline truncate flex-1"
                  >
                    {a.fileName}
                  </a>
                  <span className="text-warm-gray/80 font-mono text-[10px]">
                    {(a.sizeBytes / 1024 / 1024).toFixed(2)}MB
                  </span>
                  <ExternalLink className="size-3 text-warm-gray" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <Meta label="제보자 이메일" value={inquiry.email ?? "없음"} />
          <Meta label="접수 시각" value={relativeTimeKo(inquiry.createdAt)} />
          <Meta
            label="reCAPTCHA"
            value={
              inquiry.recaptchaScore != null
                ? inquiry.recaptchaScore.toFixed(2)
                : "—"
            }
            warn={
              inquiry.recaptchaScore != null && inquiry.recaptchaScore < 0.5
            }
          />
          <Meta
            label="IP 해시"
            value={(inquiry.submitterIpHash ?? "—").slice(0, 12) + "…"}
            mono
          />
          {inquiry.acknowledgedAt ? (
            <Meta
              label="자동 답신 발송"
              value={relativeTimeKo(inquiry.acknowledgedAt)}
            />
          ) : null}
          {inquiry.linkedDraftId ? (
            <Meta
              label="연결된 DRAFT"
              value={inquiry.linkedDraftId.slice(0, 12) + "…"}
              mono
            />
          ) : null}
        </div>
      </section>

      {/* Convert-to-DRAFT (only meaningful for NEW_CONTENT) */}
      {inquiry.type === "NEW_CONTENT" && !inquiry.linkedDraftId ? (
        <section className="bg-white border border-border rounded-md p-5 space-y-3">
          <div className="text-xs tracking-wider text-warm-gray uppercase">
            DRAFT로 변환
          </div>
          <p className="text-[11px] text-warm-gray">
            도메인을 선택하면 빈 DRAFT를 만들고 편집 화면으로 이동해요. 첨부가
            있으면 SourcePane에서 AI 추출을 돌리세요.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DOMAIN_LABELS) as DomainChoice[]).map((d) => (
              <Button
                key={d}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => convertToDraft(d)}
                disabled={busy !== null}
              >
                {busy === `convert:${d}` ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : null}
                {DOMAIN_LABELS[d]}로 변환
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Status + reply actions */}
      <section className="bg-white border border-border rounded-md p-5 space-y-3">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          상태 변경
        </div>
        <div className="flex flex-wrap gap-2">
          {(["NEW", "IN_PROGRESS", "DONE", "REJECTED"] as InquiryStatus[]).map(
            (s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={inquiry.status === s ? "primary" : "ghost"}
                onClick={() => changeStatus(s)}
                disabled={busy !== null || inquiry.status === s}
              >
                {INQUIRY_STATUS_LABELS[s]}
              </Button>
            ),
          )}
        </div>
        <p className="text-[11px] text-warm-gray/80 leading-relaxed">
          자동 답신 메일은 submitInquiry Function이 활성화된 뒤부터 발송돼요
          (현재는 키 준비 대기 중). 그동안은 상태만 표시하고 회신은 직접 메일로
          보내주세요.
        </p>
      </section>

      {/* Internal note */}
      <section className="bg-white border border-border rounded-md p-5 space-y-2">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          처리 노트 (내부용)
        </div>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="처리 내용·연락 이력 등을 적어두세요"
        />
        <div className="flex items-center gap-2 justify-end">
          {inquiry.email ? (
            <a
              href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`[K BALLET] ${inquiry.subject}`)}`}
              className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
            >
              <Send className="size-3.5" />
              제보자에게 메일 쓰기
            </a>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={saveNote}
            disabled={busy !== null}
          >
            {busy === "note" ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                저장 중…
              </>
            ) : (
              <>
                <Check className="size-3.5 mr-1.5" />
                노트 저장
              </>
            )}
          </Button>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-xs px-4 py-2 rounded-sm shadow-lg z-50">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-warm-gray">{label}</span>
      <span
        className={cn(
          mono ? "font-mono" : "",
          warn ? "text-amber-700" : "text-ink",
        )}
      >
        {warn ? <AlertTriangle className="size-3 inline mr-1" /> : null}
        {value}
      </span>
    </div>
  );
}
