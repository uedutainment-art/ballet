// Cream-toned poster placeholder used when a domain has no posterUrl.
// Designed to feel "있는 듯 없는 듯" — calm gradient + a barely-visible
// dancer silhouette + the K BALLET wordmark for brand identity.

type Props = {
  title: string;
  dateLabel?: string;
  // Optional ID for picking a palette variant deterministically — keeps a
  // grid of placeholders from feeling monotone without losing the cream
  // family.
  placeholderId?: string;
};

// 5 subtle warm tones. All cream-family so the wall of cards still feels
// unified.
const PLACEHOLDER_PALETTES: Array<{ from: string; to: string }> = [
  { from: "#FDF8F3", to: "#F4ECDF" }, // cream (matches site bg)
  { from: "#F8F0E3", to: "#EBDDC4" }, // beige
  { from: "#F7F3ED", to: "#EBE2D4" }, // sand
  { from: "#FBF5ED", to: "#F2E3CB" }, // oat
  { from: "#F8F1E8", to: "#ECD9BF" }, // champagne
];

function paletteFor(id: string | undefined) {
  if (!id) return PLACEHOLDER_PALETTES[0];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return PLACEHOLDER_PALETTES[sum % PLACEHOLDER_PALETTES.length];
}

export function PosterPlaceholder({ title, dateLabel, placeholderId }: Props) {
  const { from, to } = paletteFor(placeholderId);
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
      }}
      aria-hidden
    >
      {/* Barely-visible silhouette — sits in the upper-mid of the card so it
          doesn't fight with the bottom-aligned text block. */}
      <DancerSilhouette className="absolute left-1/2 top-[28%] -translate-x-1/2 w-20 h-28 opacity-[0.08]" />

      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="font-serif text-base font-medium leading-snug text-ink/85 line-clamp-3">
          {title}
        </div>
        {dateLabel ? (
          <div className="mt-1.5 text-[11px] text-warm-gray/90">
            {dateLabel}
          </div>
        ) : null}
        <div className="mt-3 border-t border-warm-gray/20 pt-2">
          <span className="text-[10px] tracking-[0.15em] text-warm-gray/70 uppercase">
            K BALLET &amp; CO.
          </span>
        </div>
      </div>
    </div>
  );
}

// Single-color, simple silhouette — purposely abstract so it reads as
// "발레" mood without leaning into clip-art territory. opacity is applied
// by the parent wrapper.
function DancerSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 80"
      fill="#2C3E4A"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Head */}
      <circle cx="30" cy="11" r="3.4" />
      {/* Torso + extended arms */}
      <path d="M30 15
               C 28.5 17, 27.8 20, 27.8 24
               L 16 31
               L 17 33
               L 28 28
               L 28 32
               L 19 41
               L 20.5 42.5
               L 30 35
               L 30 50
               L 27 70 L 28.5 70 L 31 53
               L 33.5 70 L 35 70 L 32 50
               L 32 35
               L 41 28
               L 43 26.5
               L 35 22
               L 35 19
               C 34 17, 32 15, 30 15 Z" />
    </svg>
  );
}
