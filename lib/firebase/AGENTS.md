<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/firebase

## Purpose
Firebase web SDK glue. Single-init client (`client.ts`), one converter per
domain, two query files (`queries.ts` for public site + `admin-queries.ts`
for admin queues), edit-log writer, and auth helpers.

## Key Files
| File | Description |
|------|-------------|
| `client.ts` | Singleton `app` + `auth` + `db` + `functions("asia-northeast3")` + `storage`. Reads `NEXT_PUBLIC_FIREBASE_*` env vars |
| `converters.ts` | `FirestoreDataConverter` for each domain — strips `id` from doc body, attaches snap id on read |
| `queries.ts` | Public read API — `listPublished*` / `getXById` / `listUpcoming*` / `listUrgent*` / org combobox search / cross-domain "by org" listings |
| `admin-queries.ts` | `countByStatus*` (uses `getCountFromServer`) + `listXByStatus` for each domain. Also `listRecentCrawlRuns` + `countOpenInquiries` |
| `editLogs.ts` | `recordEdit({ docRef, docType, fromStatus, toStatus, changedFields, ... })` — append-only audit trail |
| `auth.ts` | Sign-in/out + Google provider helpers |

## For AI Agents

### Working In This Directory
- **Always use the converter** — `.withConverter(competitionConverter)` so
  the returned objects have `id` attached. Without it you get `{ ...data }`
  with no `.id`.
- **Public queries return `[]` on error** — every helper has a try/catch
  that logs and returns empty. Pages render the empty state instead of
  crashing. Don't change this contract.
- **`listUrgent*` semantics differ per domain** — competitions filter by
  `registrationEnd >= now` (1~2 mo window), performances filter by date,
  admissions DROPPED the upper bound entirely (cycles publish 4~6 mo ahead).
  Don't unify these heuristics without understanding each domain's cadence.
- **Composite indexes** — defined in `firestore.indexes.json` at the repo
  root. Adding a `where()` + `orderBy()` combo usually needs a new index.
  Firestore error message links to the console to auto-create.

### Testing Requirements
- After adding a new query, manually call it via a temporary script in
  `scripts/_check-*.ts` to confirm it returns expected docs
- Watch for "missing index" errors in Vercel logs after deploy

### Common Patterns
- Read: `db.collection(COL).withConverter(X).get()` → `.docs.map(d => d.data())`
- Write (admin): never from this file — admin pages call `updateDoc` directly
- Cross-domain ref query: simple `where("hostOrgId", "==", orgId)` — no
  composite index needed for two equality filters

### Pitfalls (real bugs from this codebase)
- **Missing rule = silent empty** — `/performances` rule was forgotten,
  client-SDK reads returned `[]`, looked like a query bug for weeks
- **`orderBy` excludes missing fields** — Firestore drops docs that lack the
  ordered field. The "2026 KOREA CULTURE" competition was invisible on home
  because it had no `registrationEnd`.
- **Upper-bound filters are tight** — `listUrgentAdmissions` used to drop
  every admission because cycles open beyond the 90-day window

## Dependencies

### Internal
- `@/lib/types/*` all domain types
- `@/lib/firebase/client` for the singleton instances

### External
- `firebase 12.x` web SDK
- `firebase-admin 13.x` (used in `lib/admin/*` for auth claims only — most
  admin operations happen via the regular web SDK + Firestore rules)

<!-- MANUAL: -->
