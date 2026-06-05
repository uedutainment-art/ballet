<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components/public

## Purpose
Consumer-site components: Header (with mobile slide-over menu), Footer
(with logo disclaimer), domain-specific cards (CompetitionCard /
AdmissionCard / PerformanceCard / VideoCard / OrgCard), the D-day badge,
search/filter bar, and the copy-link button.

## Key Files
| File | Description |
|------|-------------|
| `Header.tsx` | Sticky top bar — desktop horizontal nav + mobile hamburger → full-screen overlay (M11.7 follow-up wired the menu state) |
| `Footer.tsx` | Brand mark + 4 nav links + logo/copyright disclaimer + contact mailto |
| `CompetitionCard.tsx` | Thin wrapper around `PosterCard` — 2:3 poster + category chip + D-day badge |
| `AdmissionCard.tsx` | Text card — school name, type, year, regStart/End. No poster |
| `PerformanceCard.tsx` | Thin wrapper around `PosterCard` — 2:3 poster + companyType chip + price/dates |
| `VideoCard.tsx` | YouTube thumbnail. 16:9 for long/live, **9:16 + 쇼츠 badge for type=="short"** |
| `OrgCard.tsx` | Logo or accent-color initial. Type chip + region |
| `DDayBadge.tsx` | D-N countdown — client component (date computed at view time). Gold ≤7d, gray otherwise |
| `FilterBar.tsx` | Search + facet pills used on list pages |
| `CopyLinkButton.tsx` | Detail-page action — copies canonical URL to clipboard |

## For AI Agents

### Working In This Directory
- **Header is `"use client"`** because the mobile menu uses `useState`,
  `usePathname`, and listens to ESC + body scroll lock. Don't refactor it
  back to a server component.
- **DDayBadge is intentionally client** — server rendering would freeze the
  "D-N" number at build time
- **Posters use PosterCard from `components/posters/`** — never duplicate
  the 2:3 logic here. Domain cards are thin wrappers.
- **lucide-react 1.16.0 gotcha** — Instagram / Youtube / Chrome icons
  aren't exported. Fall back to text labels (e.g. "Instagram ↗" instead of
  the icon). See Org detail page for the pattern.

### Testing Requirements
- Mobile viewport (390×844) — verify hamburger opens, taps close, ESC closes,
  body doesn't scroll under overlay
- Tablet (768×1024) — verify desktop nav appears and hamburger disappears
- Cards: verify hover lift + soft shadow + line-clamp-2 on titles
- 쇼츠 video card: confirm 9:16 + 빨간 "쇼츠" 배지 (M11.5 follow-up)

### Common Patterns
- Cards link to detail via `<Link href="/{domain}s/{id}">`
- Title min-height (`min-h-[2.5em]` / `min-h-[2.6em]`) keeps grid rows aligned
  even when titles wrap to 1 line
- Card hover: `hover:-translate-y-0.5` + soft shadow + 200ms ease

## Dependencies

### Internal
- `@/components/posters/PosterCard` + `PosterChip` for poster-driven cards
- `@/lib/types/*` types
- `@/lib/format` for `formatDate` / `formatDateRange`
- `@/lib/utils/youtube` for `getThumbnailUrl` + `formatDuration`
- `@/lib/cn` for class merging

### External
- `next/link`, `next/image`
- `lucide-react` (Menu, X, Search, Bell, User, Flag, …)

<!-- MANUAL: -->
