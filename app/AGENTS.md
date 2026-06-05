<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# app

## Purpose
Next.js 14 App Router root. Split into two route groups: `(public)` for the
read-only consumer site (server-rendered with ISR) and `admin` for the
operator workspace (client-rendered, Firebase Auth gated). All routes resolve
under the same domain — the route group parentheses (`(public)`) hide the
group name from the URL path.

## Key Files
| File | Description |
|------|-------------|
| `layout.tsx` | Root `<html>` shell. Loads Pretendard + Noto Serif KR fonts, global CSS, Vercel Analytics |
| `globals.css` | Tailwind base layers + CSS custom properties for the K BALLET palette |
| `not-found.tsx` | App-wide 404 fallback |
| `sitemap.ts` | Builds the sitemap from PUBLISHED Firestore docs across all domains |
| `robots.ts` | Robots.txt — allow public, disallow `/admin` |
| `manifest.ts` | Web app manifest (PWA-ready, not installed) |
| `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` | Dynamic image generation for favicons + OG cards |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `(public)/` | Consumer-facing pages — home, list pages, detail pages (see `(public)/AGENTS.md`) |
| `admin/` | Editor workspace — queues, editors, status transitions (see `admin/AGENTS.md`) |
| `403/` | Access-denied page shown when a non-editor hits `/admin/*` |

## For AI Agents

### Working In This Directory
- **Route groups** — `(public)` and `admin` siblings of `layout.tsx`. The group
  parentheses do NOT appear in URLs. Pages under `(public)/competitions/page.tsx`
  serve `/competitions`, not `/(public)/competitions`.
- **Server vs client** — public pages stay server components by default (use
  `getX` queries from `lib/firebase/queries.ts`). Admin pages are nearly all
  `"use client"` because they consume Firebase Auth + react-hook-form.
- **ISR cadence** — home page `revalidate = 300` (5 min), list pages `300`,
  detail pages `300~600`. Publishing a new doc takes up to one cache window
  to appear on home/lists. On-demand revalidation is on the M12 wish-list.
- **Auth gating** — admin pages call `useAuth()` from `@/components/providers/AuthProvider`
  and redirect to `/admin/login` if no user. Role gating uses `isAdminOrAbove(role)`.

### Testing Requirements
- `pnpm build` validates every page compiles + collects ISR routes
- Spot-check live at https://ballet-kappa.vercel.app/ after each push
- Admin pages cannot be tested via plain `curl` (auth wall); use a real browser
  session signed in as an editor

### Common Patterns
- One file = one route segment
- Dynamic segments `[id]/page.tsx` receive `{ params: { id } }` server-side
- For SSR queries that depend on the user's auth, use client components +
  `useEffect` — server components don't have access to the user session
- Public detail pages add JSON-LD `<Script type="application/ld+json">` schema

## Dependencies

### Internal
- `lib/firebase/queries.ts` — every public page calls a `list*` or `get*` helper
- `lib/firebase/admin-queries.ts` — admin queue pages use `listByStatus*`
- `components/public/*` — cards + Header + Footer
- `components/admin/*` — editors + FieldsPane variants + Sidebar

### External
- Next.js App Router
- `next/image`, `next/link`, `next/script`, `next/navigation`

<!-- MANUAL: -->
