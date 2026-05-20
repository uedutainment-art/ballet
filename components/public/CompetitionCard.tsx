import {
  CATEGORY_LABELS,
  type Competition,
} from "@/lib/types/competition";
import { DDayBadge } from "@/components/public/DDayBadge";
import { PosterCard, PosterChip } from "@/components/posters/PosterCard";
import { formatDate, formatDateRange, toDate } from "@/lib/format";

type Props = {
  competition: Competition;
};

// Vertical poster (2:3) wrapper around PosterCard.
// Category chip top-left (muted), D-day badge top-right (gold/amber for ≤7).
export function CompetitionCard({ competition: c }: Props) {
  const regEnd = toDate(c.registrationEnd);
  const dateLabel =
    formatDateRange(c.dateStart, c.dateEnd) ||
    (regEnd ? `접수마감 ${formatDate(regEnd)}` : undefined);

  return (
    <PosterCard
      href={`/competitions/${c.id}`}
      posterUrl={c.posterUrl}
      title={c.name}
      dateLabel={dateLabel}
      metaLabel={[c.venue, c.host].filter(Boolean).join(" · ") || undefined}
      placeholderId={c.id}
      topLeftBadge={
        <PosterChip variant="muted">{CATEGORY_LABELS[c.category]}</PosterChip>
      }
      topRightBadge={regEnd ? <DDayBadge date={regEnd} /> : null}
    />
  );
}
