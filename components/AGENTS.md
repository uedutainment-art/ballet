<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components

## Purpose
React components organized by audience. `admin/` and `public/` are the two
biggest groups; `ui/` holds primitive form controls; `posters/` is the shared
2:3 poster card system; `providers/` exposes app-level context (Firebase Auth).

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `admin/` | Editor workspace — FieldsPanes, SourcePane, queue tables, NewDraftButton (see `admin/AGENTS.md`) |
| `public/` | Consumer site — Header, Footer, domain cards (Competition/Admission/Performance/Video/Org) (see `public/AGENTS.md`) |
| `posters/` | Shared 2:3 PosterCard + PosterPlaceholder used by Competition + Performance cards (see `posters/AGENTS.md`) |
| `providers/` | `<AuthProvider>` — wraps app in Firebase Auth state + role fetch (see `providers/AGENTS.md`) |
| `ui/` | Primitives — Button, Input, Select, Textarea, Badge (see `ui/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **No barrel exports** — import each component by its full path
  (`@/components/admin/SourcePane`), keeps tree-shaking + IDE jump-to-def clean.
- **Tailwind only** — no CSS modules or styled-components. Brand tokens come
  from `tailwind.config.ts` (`brand`, `ink`, `cream-start`, `warm-gray`, `gold`).
- **Server vs client** — every file that uses `useState`/`useEffect`/event
  handlers needs `"use client"` at the top.
- **K BALLET tone** — Noto Serif KR for titles + numbers, Pretendard for body,
  minimal hover effects (translate-y-0.5 + soft shadow), no busy animations.

### Common Patterns
- Card components take a single typed `{ entity }` prop and link to detail
- FieldsPanes consume `useFormContext()` — must be inside `<FormProvider>`
- Domain wrappers (CompetitionCard, PerformanceCard) are thin and delegate
  to the shared `PosterCard` from `posters/`
- Lucide icons used everywhere; some icons missing in `lucide-react@1.16.0`
  (Instagram, Youtube, Chrome) — use text labels when an icon is unavailable

### Testing Requirements
- Build must compile (`pnpm build`) — catches type errors
- Visual QA via Chrome DevTools at mobile (390×844) + tablet + 1280 widths
- Hover/focus states checked in mouse + keyboard nav

## Dependencies

### Internal
- `@/lib/types/*` — domain types
- `@/lib/firebase/client` — auth + Firestore + Storage clients for client comps
- `@/lib/cn` — `clsx`-style className helper
- `@/lib/format` — date formatters
- `@/lib/utils/youtube` — YouTube URL → ID, thumbnail, embed helpers

### External
- `lucide-react@1.16.0` (legacy major — some icons absent)
- `react-hook-form`, `@hookform/resolvers`, `zod`
- `next/image`, `next/link`, `next/navigation`

<!-- MANUAL: -->
