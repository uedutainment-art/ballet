import Image from "next/image";
import Link from "next/link";
import { PosterPlaceholder } from "./PosterPlaceholder";

type Props = {
  href: string;
  posterUrl?: string;
  title: string;
  // Pre-formatted date label, e.g. "2026.07.15 ~ 07.20".
  dateLabel?: string;
  // Free-form secondary line, e.g. "예술의전당 · 한국발레협회".
  metaLabel?: string;
  // Optional 좌상단 chip (carries the domain category — passed in by domain
  // wrappers). Renders frosted on top of the poster.
  topLeftBadge?: React.ReactNode;
  // Optional 우상단 chip — usually D-day for competitions, date for performances.
  topRightBadge?: React.ReactNode;
  // ID used to pick a placeholder palette deterministically.
  placeholderId?: string;
};

// Vertical poster card (2:3) tuned for the brand:
//   - cream-base placeholder when posterUrl is missing
//   - frosted-glass status chips on the poster (don't fight the artwork)
//   - microscopic hover lift, no zoom or blur on the image itself
//   - line-clamp-2 on title to keep card heights aligned across the grid
export function PosterCard({
  href,
  posterUrl,
  title,
  dateLabel,
  metaLabel,
  topLeftBadge,
  topRightBadge,
  placeholderId,
}: Props) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-lg border border-border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(28,25,23,0.12)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-cream-start">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 264px"
            className="object-cover"
          />
        ) : (
          <PosterPlaceholder
            title={title}
            dateLabel={dateLabel}
            placeholderId={placeholderId}
          />
        )}

        {topLeftBadge ? (
          <div className="absolute top-2.5 left-2.5">{topLeftBadge}</div>
        ) : null}
        {topRightBadge ? (
          <div className="absolute top-2.5 right-2.5">{topRightBadge}</div>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        <div className="font-serif text-sm sm:text-[15px] font-medium leading-snug text-ink line-clamp-2 min-h-[2.6em]">
          {title}
        </div>
        {dateLabel ? (
          <div className="mt-1.5 text-[11px] sm:text-xs text-warm-gray">
            {dateLabel}
          </div>
        ) : null}
        {metaLabel ? (
          <div className="mt-0.5 text-[11px] sm:text-xs text-warm-gray/80 line-clamp-1">
            {metaLabel}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

// Frosted-glass chip used for category / type badges on poster cards.
// Variant controls the accent color; default is muted ink.
type ChipVariant = "muted" | "amber" | "red" | "ink";

const CHIP_TEXT: Record<ChipVariant, string> = {
  muted: "text-warm-gray",
  amber: "text-amber-700",
  red: "text-red-700",
  ink: "text-ink",
};

export function PosterChip({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-border/80 bg-white/90 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm ${CHIP_TEXT[variant]}`}
    >
      {children}
    </span>
  );
}
