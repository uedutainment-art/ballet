<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# ballet — K BALLET & CO.

## Purpose
"발레의 모든 정보, 한 곳에서." Korean ballet info hub aggregating competitions,
admissions, performances, videos, and organizations. Editor pipeline: AI-extract
(GPT-4o Vision) → 5-stage workflow (DRAFT → IN_REVIEW → READY → PUBLISHED →
ARCHIVED) → public consumption. Multi-input ingestion (image / PDF / URL /
pasted text) with an organization-driven pull crawler that runs weekly.

## Key Files
| File | Description |
|------|-------------|
| `package.json` | pnpm workspace root. `pnpm dev` (Next), `pnpm build`, seed scripts |
| `next.config.mjs` | Image domains: firebasestorage, storage.googleapis, img.youtube, i.ytimg |
| `firebase.json` | Hosting + functions + firestore + storage targets |
| `firestore.rules` | Domain-by-domain ACL: public read on PUBLISHED, editor write |
| `firestore.indexes.json` | Composite indexes for competitions / admissions / videos / crawlRuns |
| `storage.rules` | Buckets: submissions, posters, thumbnails, organizations, inquiries |
| `tailwind.config.ts` | K BALLET palette: brand=#6E7D8A, ink=#2C3E4A, cream, gold, warm-gray |
| `tsconfig.json` | strict TS, `@/*` paths, excludes `functions/` (separate package) |
| `pnpm-workspace.yaml` | Two packages: root (Next app) + `functions/` (Cloud Functions) |
| `README.md` | Project overview + setup |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js 14 App Router pages (public + admin) (see `app/AGENTS.md`) |
| `components/` | React components (admin editors + public cards + UI primitives) (see `components/AGENTS.md`) |
| `lib/` | Domain types, Firestore queries, zod schemas, utilities (see `lib/AGENTS.md`) |
| `functions/` | Firebase Cloud Functions — AI extract, pull crawler, logo download (see `functions/AGENTS.md`) |
| `scripts/` | One-off tsx scripts for seeds, migrations, backfills (see `scripts/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **pnpm only** — never npm or yarn (lockfile is `pnpm-lock.yaml`)
- TypeScript strict mode; Korean UI copy, English code + comments
- Editor flow walkthrough: AI extract → operator edits → status transitions → public render via ISR
- 5 content domains share the same pipeline pattern: `types/{x}.ts` + `zod/{x}.ts` + Firestore converter + editor + FieldsPane
- M10 organizations = shared master data referenced by 4 content domains via `*OrgId` pointers
- M11 pull crawler runs every Mon 08:00 KST against `organizations.crawlEnabled === true`

### Testing Requirements
- `pnpm build` must pass before push (Vercel auto-deploys main)
- `pnpm lint` (Next.js ESLint) — no-unused-vars is strict
- `pnpm exec tsc --noEmit` in `functions/` after editing any function
- No unit test framework yet — manual e2e via Chrome DevTools + curl

### Common Patterns
- Domain pages route group: `app/(public)/{domain}s/page.tsx` + `[id]/page.tsx`
- Editor pages: `app/admin/{domain}s/[id]/page.tsx` with SourcePane (left) + FieldsPane (right)
- `serverTimestamp()` for `aiCollectedAt` / `lastUpdatedAt` / `publishedAt`
- ISR `revalidate = 300` (home) or `600` (lists/details). On-demand revalidation not wired yet
- Firestore queries use `where()` for indexed equality, client-side `.filter()` for facets
- Edit logs append-only at `/editLogs` — never updated/deleted

## Dependencies

### External
- **Next.js 14.2** — App Router, Server Components, ISR
- **React 18** — Client components for editors, server for public reads
- **Firebase 12.x** — Auth (email/password + Google), Firestore, Storage, Functions (asia-northeast3)
- **firebase-admin 13.x** — Used in scripts + Cloud Functions
- **OpenAI 6.x** — GPT-4o for vision + JSON-mode extraction
- **cheerio** — HTML parsing in crawler
- **zod 4.x + react-hook-form 7.x** — Form validation
- **Tailwind 3.4** — Utility CSS; Noto Serif KR for titles, Pretendard for body
- **lucide-react 1.16** — Icons (note: some icons missing in this old major)
- **pdfjs-dist 5.x** — Client-side PDF→PNG for ingestion
- **date-fns 3.x** — Date math

### Deploy Targets
- **Vercel** (Next.js) — auto-deploy from `main` branch
- **Firebase Hosting** — not currently used (Vercel handles app)
- **Firebase Functions** — `firebase deploy --only functions:NAME`
- **Firebase Firestore + Storage + Auth** — project `ballet-d0d4c`

<!-- MANUAL: -->
