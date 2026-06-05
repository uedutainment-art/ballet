<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components/posters

## Purpose
Shared 2:3 vertical poster card system used by Competition + Performance
domains. Real ballet posters are almost always portrait (2:3 or 3:4) and
encode key info in the artwork itself — this module preserves that with a
poster-first layout, a brand-tone cream PosterPlaceholder for missing
artwork, and a frosted-glass `PosterChip` for chips on top of posters.

## Key Files
| File | Description |
|------|-------------|
| `PosterCard.tsx` | Generic 2:3 card. Slot-based: `topLeftBadge` / `topRightBadge` + `title` + `dateLabel` + `metaLabel`. Hover lifts -0.5y with soft shadow. Also exports `PosterChip` (frosted-glass chip with 4 variants) |
| `PosterPlaceholder.tsx` | Cream gradient fallback when `posterUrl` is missing. 5 palettes picked by id-hash, opacity-0.08 dancer SVG silhouette, bottom-anchored title + date + K BALLET wordmark |

## For AI Agents

### Working In This Directory
- **Card aspect is locked at 2:3** — set via `aspect-[2/3]` Tailwind. CLS = 0
  because the frame reserves space before the image loads.
- **PosterPlaceholder uses `object-cover` semantics**: title block sits in the
  bottom 30% of the card, dancer silhouette in the upper-mid. Don't move
  these without checking against the cream-family palette readability.
- **No external image domains** beyond `firebasestorage.googleapis.com` +
  `storage.googleapis.com` (set in `next.config.mjs`). If a poster needs to
  come from elsewhere, it must be pre-uploaded to Firebase Storage first.
- **PosterChip variants** — `muted` (warm-gray) / `amber` (amber-700) /
  `red` (red-700) / `ink`. Use sparingly; cream palette can't carry many
  saturated chips at once.

### Testing Requirements
- Mobile (390w) — 2-column grid, card width ~168px, aspect-2:3 = 252px tall
- Desktop (1280w) — 4-column grid in app's typical container, ~264px wide
- Mixed grid with placeholders + posters — verify cream tones harmonize and
  the title block remains readable

### Common Patterns
- Domain wrapper (CompetitionCard / PerformanceCard) passes:
  - `posterUrl` from doc
  - `title` from doc
  - `dateLabel` formatted via `formatDateRange`
  - `metaLabel` joined string (e.g. `"예술의전당 · 한국발레협회"`)
  - `topLeftBadge={<PosterChip>{categoryLabel}</PosterChip>}`
  - `topRightBadge={<DDayBadge ... />}` (competitions only)
  - `placeholderId={doc.id}` for deterministic palette pick

### Sizing Reference
| Breakpoint | Grid | Card width | Card height (2:3) |
|---|---|---|---|
| Mobile (~390w) | 2 col gap 12 | ~168 | ~252 |
| Tablet (~768w) | 3 col gap 16 | ~232 | ~348 |
| Desktop (~1280w) | 4 col gap 24 | ~264 | ~396 |

## Dependencies

### Internal
- `@/lib/cn` for class merging

### External
- `next/link`, `next/image`

<!-- MANUAL: -->
