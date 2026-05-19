import { cn } from "@/lib/cn";

type Props = {
  value?: number;
};

export function ConfidenceMeter({ value }: Props) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-warm-gray">
        <span className="size-1.5 rounded-full bg-warm-gray/50" />
        AI 미사용
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tone =
    clamped >= 80
      ? { dot: "bg-green-500", text: "text-green-700" }
      : clamped >= 60
        ? { dot: "bg-amber-500", text: "text-amber-700" }
        : { dot: "bg-red-500", text: "text-red-700" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px]",
        tone.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      AI 신뢰도 {clamped}%
    </span>
  );
}
