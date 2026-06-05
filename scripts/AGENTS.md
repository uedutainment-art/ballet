<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# scripts

## Purpose
One-off TypeScript scripts executed via `pnpm tsx`. Used for Firestore
seeding, migrations, backfills, and ad-hoc bootstraps. All scripts use
`firebase-admin` (bypasses security rules) and load credentials from
`.env.local` (`FIREBASE_SERVICE_ACCOUNT` JSON blob).

## Key Files
| File | Description |
|------|-------------|
| `seed-superadmin.ts` | Grant SUPER_ADMIN role to a Firebase Auth user (initial bootstrap) |
| `seed-competitions.ts` | M5 — 5 competition DRAFTs and a few PUBLISHED |
| `seed-admissions.ts` | M7 — 5 admission seeds (예원 / 선화예중 / 서울예고 / 한예종 / 한성대) |
| `seed-performances.ts` | M8 — 5 performance seeds (백조의 호수 / 라 바야데르 / Crossroads / 젊은 무용가 / K-Ballet Tour) |
| `seed-videos.ts` | M9 — 5 PUBLISHED videos using placeholder YouTube ID `dQw4w9WgXcQ` |
| `seed-organizations.ts` | M10 — 30 PUBLISHED orgs (대학 10 + 예고 6 + 예중 4 + 발레단 5 + 협회 3 + 공연장 2) |
| `seed-bfk-2026.ts` | One-off — BFK 2026 festival + TALE OF TALES + auto-poster from SAC og:image |
| `backfill-org-references.ts` | M10 — match existing content `host/schoolName/company/venue` to org docs by name |
| `migrate-crawl-fields.ts` | M11-1 — add default `crawlEnabled` + `crawlStatus` to every org |
| `migrate-legacy-sources.ts` | M11-7 — port the 5 hardcoded SOURCES into the org-driven crawler |

## For AI Agents

### Working In This Directory
- **All scripts use `firebase-admin`** — they bypass Firestore security rules.
  Don't run on production data unless you know what you're doing.
- **Credentials** — set `FIREBASE_SERVICE_ACCOUNT` in `.env.local` (JSON blob
  from Firebase console) or `GOOGLE_APPLICATION_CREDENTIALS` env var. The
  `loadEnvLocal()` helper at the top of each script reads `.env.local`.
- **Idempotency is required** — every seed/migration should detect existing
  state and skip rather than clobber. Pattern: query first, only write the
  diff. Re-running is a safety net.
- **Script names starting with `_`** are temporary diagnostics (e.g.
  `_check-perf.ts`) — delete after use, never commit.
- **Storage bucket** — explicit `"ballet-d0d4c.firebasestorage.app"` when the
  script touches Storage (auto-discovery picks the wrong default).

### Testing Requirements
- Add a `--dry` flag mode where the operation is risky (backfill does this)
- Print a summary count at the end (created / skipped / updated / errors)
- Run against a small subset first when possible

### Common Patterns
```typescript
loadEnvLocal();
initAdmin();
const db = getFirestore();
// idempotency check
const existing = await db.collection("...").doc(id).get();
if (existing.exists) { skip; }
// write
await db.collection("...").doc(id).set(payload, { merge: true });
```

### Running
- `pnpm seed:videos` — uses `package.json` scripts as defined
- `pnpm tsx scripts/<file>.ts` — direct invocation
- All scripts log via plain `console.log` (no Firebase logger here)

## Dependencies

### Internal
- `firebase-admin` SDK — Firestore + Storage + Auth Admin APIs

### External
- `tsx` (dev dep) — TS runner used by all scripts

<!-- MANUAL: -->
