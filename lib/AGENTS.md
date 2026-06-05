<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib

## Purpose
Shared TypeScript modules. Domain types, Firebase client+admin queries, zod
form schemas, formatting helpers, organization health math. No React here —
strictly framework-agnostic logic so it can be reused from server components,
client components, scripts, and Cloud Functions (functions/ also has its own
copies of related types).

## Key Files
| File | Description |
|------|-------------|
| `cn.ts` | Tailwind class merger (clsx-style) — used everywhere |
| `format.ts` | `formatDate`, `formatDateRange`, `toDate` — Timestamp → display string |
| `site.ts` | `SITE_URL` constant (Vercel URL fallback) used by canonical URLs + JSON-LD |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `admin/` | Editor-only logic: status transitions, autosave hook, re-extract callable, createDraft helper (see `admin/AGENTS.md`) |
| `firebase/` | Firebase client singleton, Firestore converters, queries (public + admin), editLogs, auth helpers (see `firebase/AGENTS.md`) |
| `organization/` | Org-specific business logic — currently `computeHealth()` for crawler signal (see `organization/AGENTS.md`) |
| `types/` | Domain types: Competition, Admission, Performance, Video, Organization, CrawlRun, Inquiry, ContentStatus (see `types/AGENTS.md`) |
| `utils/` | Pure helpers: youtube URL parsing, relativeTimeKo, pdfToImage (see `utils/AGENTS.md`) |
| `zod/` | Form schemas (one per domain) bridging Firestore shapes ↔ form values (see `zod/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **No `"use client"` here** — these modules are imported by both server and
  client code. Putting that directive at the top forces everything that
  imports them to be a client component.
- **Types are source of truth** — when adding a Firestore field, edit
  `lib/types/{x}.ts` first, then zod schema, then editor formToPatch.
- **Date discipline** — Firestore stores `Timestamp`, forms use ISO strings
  (`yyyy-mm-dd`), display uses `formatDate(...)`. Conversions happen at the
  boundary (zod → patch and Timestamp → form values).
- **Konventions** — required free-text starts blank in DRAFTs; required enums
  get a default in `createDraft.ts`.

### Testing Requirements
- Pure modules — no runtime test framework yet. Type checker catches most
  mistakes; manual e2e through the editor confirms round-trips.

### Common Patterns
- One file per domain in `types/` + `zod/` (mirror each other)
- `lib/firebase/queries.ts` has `list*` + `get*` per domain; `admin-queries.ts`
  has `countByStatus*` + `list*ByStatus`
- Editor form values flow: Firestore → `xxxToForm()` → form state → user edits
  → `formToPatch()` → Firestore via `updateDoc()`

## Dependencies

### Internal
- `lib/firebase/client` initializes once per process; reused everywhere

### External
- `firebase` (web SDK) for client-side queries
- `firebase-admin` for scripts (admin SDK bypasses rules)
- `zod 4.x` for schema validation
- `date-fns` for date math

<!-- MANUAL: -->
