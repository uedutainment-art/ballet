import Link from "next/link";
import {
  SCHOOL_TYPE_COLORS,
  SCHOOL_TYPE_LABELS,
  type Admission,
} from "@/lib/types/admission";
import { DDayBadge } from "@/components/public/DDayBadge";
import { formatDate, toDate } from "@/lib/format";

type Props = {
  admission: Admission;
};

function initials(school: string): string {
  // First non-whitespace 2 characters (handles Korean: "한국예술…" → "한국").
  const trimmed = school.replace(/\s+/g, "");
  return trimmed.slice(0, 2) || "?";
}

export function AdmissionCard({ admission: a }: Props) {
  const color = SCHOOL_TYPE_COLORS[a.schoolType];
  const regEnd = toDate(a.regEnd);
  const regStart = toDate(a.regStart);

  return (
    <Link
      href={`/admissions/${a.id}`}
      className="group block border border-border rounded-md bg-white overflow-hidden transition-transform hover:-translate-y-px"
    >
      <div className="p-4 flex items-start gap-3">
        <div
          className="size-14 rounded-full flex items-center justify-center font-serif text-white text-base shrink-0"
          style={{ background: color }}
          aria-hidden
        >
          {initials(a.schoolName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray">
              {SCHOOL_TYPE_LABELS[a.schoolType]} · {a.year}학년도
            </span>
            {regEnd ? <DDayBadge date={regEnd} /> : null}
          </div>
          <div className="mt-2 text-sm font-serif font-medium text-ink leading-snug truncate">
            {a.schoolName}
          </div>
          <div className="text-[12px] text-warm-gray truncate">
            {a.department}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 text-[11px] text-warm-gray space-y-0.5">
        <div>
          원서{" "}
          {regStart || regEnd ?
            `${regStart ? formatDate(regStart) : "—"} – ${regEnd ? formatDate(regEnd) : "—"}` :
            "일정 미확정"}
        </div>
      </div>
    </Link>
  );
}
