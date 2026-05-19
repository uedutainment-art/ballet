"use client";

import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/cn";

type DDayBadgeProps = {
  date: Date | string;
  className?: string;
};

// Client component on purpose: D-N must be computed relative to "now" in the
// viewer's browser, otherwise SSG would freeze the number at build time.
export function DDayBadge({ date, className }: DDayBadgeProps) {
  const target = typeof date === "string" ? new Date(date) : date;
  const days = differenceInCalendarDays(target, new Date());

  const base =
    "inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm tracking-wider font-medium text-white";

  if (days < 0) {
    return (
      <span className={cn(base, "bg-warm-gray/60", className)}>마감됨</span>
    );
  }
  if (days <= 7) {
    return <span className={cn(base, "bg-gold", className)}>D-{days}</span>;
  }
  return <span className={cn(base, "bg-warm-gray", className)}>D-{days}</span>;
}
