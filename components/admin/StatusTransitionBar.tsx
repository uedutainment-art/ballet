"use client";

import { Archive, Check, Pause, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ContentStatus } from "@/lib/types/status";

type Props = {
  status: ContentStatus;
  dirty: boolean;
  canPublish: boolean;
  busy: boolean;
  onSave: () => void;
  onReady: () => void;
  onPublish: () => void;
  onHold: () => void;
  onArchive: () => void;
};

export function StatusTransitionBar({
  status,
  dirty,
  canPublish,
  busy,
  onSave,
  onReady,
  onPublish,
  onHold,
  onArchive,
}: Props) {
  const showReady = status === "DRAFT" || status === "IN_REVIEW";
  const showPublish = status === "READY";

  return (
    <div className="sticky bottom-0 bg-white border border-border rounded-md p-3 flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant={dirty ? "primary" : "ghost"}
        size="md"
        onClick={onSave}
        disabled={busy}
        title="저장 (⌘S)"
      >
        <Save className="size-3.5 mr-1.5" />
        저장
        <kbd className="ml-2 text-[10px] opacity-70">⌘S</kbd>
      </Button>

      {showReady ? (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onReady}
          disabled={busy || dirty}
          title={
            dirty
              ? "먼저 저장한 뒤 READY로 넘기세요"
              : "READY로 넘김 (⌘↵)"
          }
        >
          <Check className="size-3.5 mr-1.5" />
          READY로 넘김
          <kbd className="ml-2 text-[10px] opacity-70">⌘↵</kbd>
        </Button>
      ) : null}

      {showPublish ? (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onPublish}
          disabled={busy || dirty || !canPublish}
          title={
            !canPublish
              ? "공개 승인은 ADMIN 이상 권한이 필요해요"
              : dirty
                ? "먼저 저장한 뒤 공개 승인하세요"
                : "공개 승인 (⌘↵)"
          }
        >
          <Send className="size-3.5 mr-1.5" />
          공개 승인
          <kbd className="ml-2 text-[10px] opacity-70">⌘↵</kbd>
        </Button>
      ) : null}

      <div className="flex-1" />

      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={onHold}
        disabled={busy}
        title="보류 (⌘.)"
      >
        <Pause className="size-3.5 mr-1.5" />
        보류
        <kbd className="ml-2 text-[10px] opacity-70">⌘.</kbd>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={onArchive}
        disabled={busy || status === "ARCHIVED"}
        title="보관"
      >
        <Archive className="size-3.5 mr-1.5" />
        보관
      </Button>
    </div>
  );
}
