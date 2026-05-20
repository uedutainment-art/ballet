"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { httpsCallable } from "firebase/functions";
import { AlertTriangle, Loader2, Play, RotateCcw } from "lucide-react";
import { functions } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { relativeTimeKo } from "@/lib/utils/relativeTime";
import type { Organization } from "@/lib/types/organization";
import type { OrganizationFormValues } from "@/lib/zod/organization";
import { cn } from "@/lib/cn";

type Props = {
  org: Organization;
  onCrawlFinished: () => void;
};

type ManualResult = {
  runId: string;
  totalNewDrafts: number;
  totalErrors: number;
};

// Pull-crawler configuration block rendered inside the org editor's right
// pane. Reads + writes through react-hook-form context so saving the form
// persists URL changes. The "지금 크롤" + "해시 초기화" buttons call
// onCall functions directly — they don't go through autosave because the
// effect is server-side and one-shot.
export function OrgCrawlSection({ org, onCrawlFinished }: Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OrganizationFormValues>();

  const [crawling, setCrawling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const enabled = watch("crawlEnabled") ?? false;
  const status = org.crawlStatus ?? {};

  async function handleCrawlNow() {
    setCrawling(true);
    setFeedback(null);
    try {
      const callable = httpsCallable<{ orgId: string }, ManualResult>(
        functions,
        "triggerCrawlForOrg",
      );
      const res = await callable({ orgId: org.id });
      const { totalNewDrafts, totalErrors } = res.data;
      if (totalErrors > 0 && totalNewDrafts === 0) {
        setFeedback({ kind: "err", text: "오류가 있었어요. 아래 상태 블록을 확인하세요." });
      } else {
        setFeedback({
          kind: "ok",
          text: `완료 · 신규 DRAFT ${totalNewDrafts}건${totalErrors > 0 ? ` · 오류 ${totalErrors}` : ""}`,
        });
      }
      onCrawlFinished();
    } catch (err) {
      setFeedback({
        kind: "err",
        text: err instanceof Error ? err.message : "크롤 실행에 실패했어요",
      });
    } finally {
      setCrawling(false);
    }
  }

  async function handleResetHashes() {
    if (!confirm("seen URL 해시를 모두 비울까요? 다음 크롤에서 같은 글을 다시 추출합니다.")) {
      return;
    }
    setResetting(true);
    setFeedback(null);
    try {
      const callable = httpsCallable<{ orgId: string }, { ok: boolean }>(
        functions,
        "resetOrgSeenHashes",
      );
      await callable({ orgId: org.id });
      setFeedback({ kind: "ok", text: "URL 해시가 초기화됐어요" });
      onCrawlFinished();
    } catch (err) {
      setFeedback({
        kind: "err",
        text: err instanceof Error ? err.message : "초기화에 실패했어요",
      });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="border border-border rounded-md p-3 bg-cream-start/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          🤖 자동수집
        </div>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            {...register("crawlEnabled")}
            className="accent-brand"
          />
          <span className="text-ink">활성화</span>
        </label>
      </div>

      {enabled ? (
        <div className="space-y-3">
          <div className="text-[10px] text-warm-gray/80 leading-relaxed">
            게시판 URL을 입력하면 매주 월요일 08:00 KST에 자동으로 새 글을
            훑고 DRAFT를 만들어요. 비공개 URL이며 사용자에게는 보이지 않아요.
          </div>

          <FormField
            label="콩쿠르 공지 게시판 URL"
            error={errors.competitionBoardUrl?.message}
          >
            <Input
              type="url"
              {...register("competitionBoardUrl")}
              placeholder="https://example.org/notice"
            />
          </FormField>

          <FormField
            label="입시 공지 게시판 URL"
            error={errors.admissionBoardUrl?.message}
          >
            <Input
              type="url"
              {...register("admissionBoardUrl")}
              placeholder="https://example.org/admission"
            />
          </FormField>

          <FormField
            label="공연 일정 페이지 URL"
            error={errors.performanceBoardUrl?.message}
          >
            <Input
              type="url"
              {...register("performanceBoardUrl")}
              placeholder="https://example.org/schedule"
            />
          </FormField>

          <FormField
            label="제외 URL 패턴 (정규식, 옵션)"
            hint="예: .*/qna/.* 또는 \\?id=99"
          >
            <Input
              {...register("excludeUrlPattern")}
              placeholder=".*/qna/.*"
            />
          </FormField>

          <FormField
            label="커스텀 User-Agent (옵션)"
            hint="기본은 KBalletBot/1.0 — 차단 사이트에서만 바꾸세요"
          >
            <Input
              {...register("crawlUserAgent")}
              placeholder="Mozilla/5.0 ..."
            />
          </FormField>

          <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <StatusRow label="최근 실행" value={relativeTimeKo(status.lastRunAt)} />
            <StatusRow
              label="최근 성공"
              value={relativeTimeKo(status.lastSuccessAt)}
            />
            <StatusRow
              label="누적 수집"
              value={`${status.totalCollected ?? 0}건`}
            />
            <StatusRow
              label="연속 실패"
              value={`${status.consecutiveFailures ?? 0}회`}
              warn={(status.consecutiveFailures ?? 0) > 0}
            />
            {status.lastError ? (
              <div className="col-span-2 text-red-700 bg-red-50 px-2 py-1.5 rounded-sm flex items-start gap-1.5">
                <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                <span className="break-all">{status.lastError}</span>
              </div>
            ) : null}
            <StatusRow
              label="seen URL 해시"
              value={`${status.seenUrlHashes?.length ?? 0}개`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCrawlNow}
              disabled={crawling || resetting}
            >
              {crawling ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  크롤 중…
                </>
              ) : (
                <>
                  <Play className="size-3.5 mr-1.5" />
                  지금 크롤
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetHashes}
              disabled={crawling || resetting}
            >
              {resetting ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="size-3.5 mr-1.5" />
              )}
              URL 해시 초기화
            </Button>
          </div>

          {feedback ? (
            <div
              className={cn(
                "rounded-sm text-[11px] px-2 py-1.5",
                feedback.kind === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700",
              )}
            >
              {feedback.text}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-[11px] text-warm-gray/80">
          비활성화 상태예요. 활성화하면 게시판 URL과 자동수집 일정이 표시돼요.
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] text-warm-gray">{label}</label>
        {hint ? (
          <span className="text-[10px] text-warm-gray/70">· {hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="text-[10px] text-red-600">{error}</div>
      ) : null}
    </div>
  );
}

function StatusRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-warm-gray">{label}</span>
      <span
        className={cn(
          "font-mono",
          warn ? "text-amber-700" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
