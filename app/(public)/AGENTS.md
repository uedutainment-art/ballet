<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# (public)

## Purpose
Consumer-facing route group. Every page here renders without auth, via ISR
against Firestore PUBLISHED documents. The parentheses in the folder name
hide it from URLs — `(public)/competitions/page.tsx` serves `/competitions`.

## Key Files
| File | Description |
|------|-------------|
| `layout.tsx` | Wraps all public pages with the Header + Footer + base styling |
| `page.tsx` | Home — 4 slot grids: 마감 임박 콩쿠르 / 최신 입시정보 / 다가오는 공연 / 최신 영상 |

## Subdirectories (each has `page.tsx` + `[id]/page.tsx`)
| Directory | Purpose |
|-----------|---------|
| `competitions/` | List + detail. 2:3 PosterCard grid. JSON-LD Event schema |
| `admissions/` | List + detail. Text cards (no posters). Sorted ascending by `regStart` |
| `performances/` | List + detail. 2:3 PosterCard grid. JSON-LD TheaterEvent schema |
| `videos/` | List with level + series filters. Detail with YouTube iframe + JSON-LD VideoObject. Shorts use 9:16 |
| `organizations/` | Directory + per-org detail with 4 tabs (콩쿠르 / 입시 / 공연 / 영상) |
| `contact/` | Inquiry form page (M11.7) — 5 유형 + 첨부 + reCAPTCHA placeholder |
| `submit/` | Anonymous poster submission form — Firebase Storage upload triggers AI extract |

## For AI Agents

### Working In This Directory
- **All pages are async server components by default** — they call
  `getX` / `listX` from `lib/firebase/queries.ts` server-side.
- **ISR revalidate** — `300` (5 min) is standard. Home + lists use this.
  Detail pages can go `300~600` (rarely updated). Set via
  `export const revalidate = 300` at the top of `page.tsx`.
- **No on-demand revalidation yet** — publishing a new doc takes up to one
  cache window to appear. Mentioned in M12 wish-list.
- **Cards have varying aspect ratios** — competitions + performances use
  2:3 PosterCard; videos use 16:9 (or 9:16 for shorts); admissions + orgs
  use text cards. Grid layouts adjust per page accordingly.

### Common Patterns
- Public detail pages add JSON-LD via `<Script type="application/ld+json">`
- `notFound()` from `next/navigation` when the doc doesn't exist OR isn't
  PUBLISHED — never reveal DRAFT/ARCHIVED docs publicly
- Korean copy throughout; date strings via `formatDate`/`formatDateRange`
- Empty states use a dashed-border cream-tinted card with a CTA link

### Common Pitfalls
- Firestore security rules denied performance reads silently until M11.5 —
  always confirm rule file has an explicit match block for any new domain
- ISR caches can be 5 min stale; "안 보여요" is usually cache, not data
- `listUrgent*` filters can be too tight for the domain (admissions cycles
  open 4~6 mo ahead, so 90-day window was wrong — M11.5 fix dropped upper
  bound)

## Dependencies

### Internal
- `@/lib/firebase/queries` — all data reads
- `@/components/public/*` — cards + Header + Footer
- `@/components/posters/PosterCard` — for competition + performance cards

### External
- Next.js App Router, `next/image`, `next/script`, `next/navigation`

<!-- MANUAL: -->
