import {
  COMPANY_TYPE_LABELS,
  type Performance,
} from "@/lib/types/performance";
import { PosterCard, PosterChip } from "@/components/posters/PosterCard";
import { formatDateRange } from "@/lib/format";

type Props = {
  performance: Performance;
};

// Vertical poster (2:3) wrapper around PosterCard.
// Company-type chip top-left, date range in the body.
export function PerformanceCard({ performance: p }: Props) {
  const dateLabel = formatDateRange(p.dateStart, p.dateEnd) || undefined;
  const priceLabel = (() => {
    if (p.ticketPriceMin && p.ticketPriceMax) {
      if (p.ticketPriceMin === p.ticketPriceMax) {
        return `₩${p.ticketPriceMin.toLocaleString()}`;
      }
      return `₩${p.ticketPriceMin.toLocaleString()} – ₩${p.ticketPriceMax.toLocaleString()}`;
    }
    if (p.ticketPriceMin) return `₩${p.ticketPriceMin.toLocaleString()}부터`;
    return undefined;
  })();
  const metaLabel =
    [p.company, p.venue].filter(Boolean).join(" · ") +
    (priceLabel ? ` · ${priceLabel}` : "");

  return (
    <PosterCard
      href={`/performances/${p.id}`}
      posterUrl={p.posterUrl}
      title={p.title}
      dateLabel={dateLabel}
      metaLabel={metaLabel || undefined}
      placeholderId={p.id}
      topLeftBadge={
        p.companyType ? (
          <PosterChip variant="muted">
            {COMPANY_TYPE_LABELS[p.companyType]}
          </PosterChip>
        ) : null
      }
    />
  );
}
