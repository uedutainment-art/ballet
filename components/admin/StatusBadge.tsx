import type { ContentStatus } from "@/lib/types/status";
import { cn } from "@/lib/cn";

type Props = {
  status: ContentStatus;
  size?: "sm" | "md";
};

const LABELS: Record<ContentStatus, string> = {
  DRAFT: "AI 1차",
  IN_REVIEW: "검수 중",
  READY: "승인 대기",
  PUBLISHED: "공개",
  ARCHIVED: "보관",
};

const CLASSES: Record<ContentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  READY: "bg-blue-50 text-blue-700",
  PUBLISHED: "bg-green-50 text-green-700",
  ARCHIVED: "bg-gray-50 text-gray-400",
};

export function StatusBadge({ status, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm font-medium",
        size === "sm"
          ? "text-[10px] px-2 py-[3px]"
          : "text-xs px-2.5 py-1",
        CLASSES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
