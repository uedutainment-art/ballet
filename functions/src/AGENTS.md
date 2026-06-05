<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src

## Purpose
All Cloud Functions source. One subdirectory per logical area. `index.ts`
is the single entrypoint — every exported function name here becomes a
deployable function (referenced by `firebase deploy --only functions:NAME`).

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | Single entrypoint — re-exports every callable + trigger. Adding a new function = add one `export { x } from "./..."` line |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `ai/` | Domain-specific extraction prompts + per-domain extractor functions wrapping GPT-4o + shared `fetchPageText` HTML cleaner (see `ai/AGENTS.md`) |
| `extract/` | Generic `extractFromInput` callable — the editor's "지금 분석" / "AI 재추출" entrypoint (see `extract/AGENTS.md`) |
| `push/` | Storage-triggered `extractFromPoster` — fires on `/submissions/*` upload, creates DRAFT competition (see `push/AGENTS.md`) |
| `pull/` | M11 weekly crawler infrastructure — runner, scheduler, manual triggers, per-org crawler (see `pull/AGENTS.md`) |
| `organization/` | `downloadOrgLogo` callable — fetches a logo URL, uploads to Storage, updates the org doc (see `organization/AGENTS.md`) |
| `inquiry/` | M11.7 `submitInquiry` callable + README (deferred — needs reCAPTCHA + Resend keys) (see `inquiry/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **`index.ts` re-exports** — never put function logic here directly. Just
  `export { name } from "./folder/file";`
- **Every function pins `region: "asia-northeast3"`** — Seoul. Don't deploy
  to other regions without a strong reason (latency for Korean users).
- **Init once** — `if (getApps().length === 0) initializeApp();` at module
  load. Don't call `initializeApp()` inside the handler.
- **Secrets via `defineSecret`** — pinned to the function options
  `secrets: [OPENAI_KEY]`. Read at handler time with `.value()`.

### Testing Requirements
- `pnpm exec tsc --noEmit` from `functions/` after every edit — Google
  ESLint preset is strict, auto-fix handles most issues
- Smoke test by invoking from the admin UI; check Firebase function logs

### Common Patterns
- onCall: auth + role check → validate request → do work → return
- onSchedule: no auth (system-triggered) → top-level try/catch → log result
- onObjectFinalized: filter by path prefix early → bail on non-matching paths

### Adding a New Function
1. Create `src/<area>/<name>.ts` with the function logic
2. Add `export { name } from "./<area>/<name>";` to `src/index.ts`
3. `pnpm exec tsc --noEmit` from `functions/`
4. `pnpm exec firebase deploy --only functions:<name>` from repo root

## Dependencies

### External
- `firebase-functions 6.x` — defineSecret, onCall, onSchedule, onObjectFinalized
- `firebase-admin 13.x` — Firestore, Storage, Auth admin SDKs

<!-- MANUAL: -->
