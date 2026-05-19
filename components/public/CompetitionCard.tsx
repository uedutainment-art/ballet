import Link from "next/link";
import Image from "next/image";
import {
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  type Competition,
} from "@/lib/types/competition";
import { DDayBadge } from "@/components/public/DDayBadge";
import { formatDate, toDate } from "@/lib/format";

type Props = {
  competition: Competition;
};

export function CompetitionCard({ competition: c }: Props) {
  const [gFrom, gTo] = CATEGORY_GRADIENTS[c.category];
  const regEnd = toDate(c.registrationEnd);

  return (
    <Link
      href={`/competitions/${c.id}`}
      className="group block border border-border rounded-md bg-white overflow-hidden transition-transform hover:-translate-y-px"
    >
      <div className="relative h-[110px] overflow-hidden">
        {c.posterUrl ? (
          <Image
            src={c.posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${gFrom} 0%, ${gTo} 100%)`,
            }}
            aria-hidden
          />
        )}
        <div className="absolute top-2 left-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-white/80 text-warm-gray backdrop-blur-sm">
          {CATEGORY_LABELS[c.category]}
        </div>
        {regEnd ? (
          <div className="absolute top-2 right-2">
            <DDayBadge date={regEnd} />
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <div className="text-sm font-serif font-medium text-ink leading-snug line-clamp-2 min-h-[2.5em]">
          {c.name}
        </div>
        <div className="mt-2 text-[11px] text-warm-gray">
          접수마감 {regEnd ? formatDate(regEnd) : "—"}
        </div>
        <div className="mt-0.5 text-[11px] text-brand truncate">{c.venue}</div>
      </div>
    </Link>
  );
}
