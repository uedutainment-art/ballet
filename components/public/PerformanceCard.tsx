import Link from "next/link";
import Image from "next/image";
import {
  COMPANY_GRADIENTS,
  COMPANY_TYPE_LABELS,
  type Performance,
} from "@/lib/types/performance";
import { formatDateRange, toDate } from "@/lib/format";

type Props = {
  performance: Performance;
};

export function PerformanceCard({ performance: p }: Props) {
  const gradient = p.companyType ?
    COMPANY_GRADIENTS[p.companyType] :
    COMPANY_GRADIENTS.other;
  const [gFrom, gTo] = gradient;
  const dateStart = toDate(p.dateStart);

  const priceLabel = (() => {
    if (p.ticketPriceMin && p.ticketPriceMax) {
      if (p.ticketPriceMin === p.ticketPriceMax) {
        return `₩${p.ticketPriceMin.toLocaleString()}`;
      }
      return `₩${p.ticketPriceMin.toLocaleString()} – ₩${p.ticketPriceMax.toLocaleString()}`;
    }
    if (p.ticketPriceMin) return `₩${p.ticketPriceMin.toLocaleString()}부터`;
    if (p.ticketPriceMax) return `₩${p.ticketPriceMax.toLocaleString()}까지`;
    return null;
  })();

  return (
    <Link
      href={`/performances/${p.id}`}
      className="group block border border-border rounded-md bg-white overflow-hidden transition-transform hover:-translate-y-px"
    >
      <div className="relative h-[140px] overflow-hidden">
        {p.posterUrl ? (
          <Image
            src={p.posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
        {p.companyType ? (
          <div className="absolute top-2 left-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-white/85 text-warm-gray backdrop-blur-sm">
            {COMPANY_TYPE_LABELS[p.companyType]}
          </div>
        ) : null}
        {dateStart ? (
          <div className="absolute bottom-2 right-2 inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-ink/80 text-white">
            {formatDateRange(p.dateStart, p.dateEnd) || "—"}
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <div className="text-sm font-serif font-medium text-ink leading-snug line-clamp-2 min-h-[2.5em]">
          {p.title}
        </div>
        <div className="mt-1 text-[12px] text-warm-gray truncate">
          {p.company}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-brand truncate">{p.venue}</span>
          {priceLabel ? (
            <span className="text-[11px] text-warm-gray shrink-0">
              {priceLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
