<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions

## Purpose
Firebase Cloud Functions package. Separate `package.json` and `tsconfig.json`
from the Next.js root (own deps, Node 20 runtime). Hosts the AI extraction
callable, the weekly + on-demand pull crawler, the org logo downloader, and
the (deferred) inquiry submitter. All functions are deployed to region
`asia-northeast3` (Seoul).

## Key Files
| File | Description |
|------|-------------|
| `package.json` | Node 20 engine, separate deps (openai, cheerio, firebase-admin, firebase-functions) |
| `tsconfig.json` | Output to `lib/` (compiled JS), excluded from root build |
| `.eslintrc.js` | Google preset with require-jsdoc / valid-jsdoc / max-len disabled |
| `src/index.ts` | Single entrypoint — exports every callable + trigger by name |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | All function source. One directory per logical area (see `src/AGENTS.md`) |
| `lib/` | TS build output (gitignored). Never edit directly |

## For AI Agents

### Working In This Directory
- **Deploy a single function**: `pnpm exec firebase deploy --only functions:NAME`
  from the repo root (NOT from `functions/`). Predeploy runs lint + build.
- **Region** — every function pins `region: "asia-northeast3"` in `onCall` /
  `onSchedule` / `onObjectFinalized` options.
- **Storage bucket** — auto-discovery picks the wrong default; use
  `bucket: "ballet-d0d4c.firebasestorage.app"` explicitly when needed (e.g.
  `getStorage().bucket("ballet-d0d4c.firebasestorage.app")`).
- **Secrets** — `OPENAI_API_KEY` via `defineSecret`. Future: `RESEND_API_KEY`,
  `RECAPTCHA_SECRET_KEY` (deferred — see `src/inquiry/README.md`).
- **Auth pattern** — every callable starts with `if (!req.auth?.uid)` + a
  Firestore `users/{uid}` role check. Editor / Admin / Super-admin levels.

### Testing Requirements
- `pnpm exec tsc --noEmit` from `functions/` after any edit
- `pnpm exec eslint --ext .js,.ts --fix .` resolves Google preset complaints
  (indentation is the most common — the auto-fix handles it)
- After deploy, check `pnpm exec firebase functions:list` to confirm
- For onCall: invoke from the admin UI; check logs via Firebase console
- For schedulers: trigger manually first via `pullCrawlerManual` rather than
  waiting for cron

### Common Patterns
- Each function file: a single `export const NAME = onCall(...)` (or
  `onSchedule`) with options + handler in one place
- Errors throw `HttpsError(code, message)` — caller in browser receives
  `code` + `message` cleanly
- Logging via `firebase-functions/logger` (NOT console.log)
- Long-running ops set `timeoutSeconds: 540` (9 min cap on 2nd gen)

### Deploying Multiple Functions
```bash
pnpm exec firebase deploy --only \
  functions:extractFromInput,functions:downloadOrgLogo,functions:pullCrawlerScheduled
```

## Dependencies

### External
- `firebase-functions 6.x` — onCall / onSchedule / onObjectFinalized
- `firebase-admin 13.x` — Firestore + Storage + Auth admin
- `openai 6.x` — GPT-4o vision + JSON mode
- `cheerio 1.x` — HTML parsing for the crawler
- Global `fetch` from Node 20 (no node-fetch dependency)

### Region + Project
- Project: `ballet-d0d4c`
- Region: `asia-northeast3` (Seoul)

<!-- MANUAL: -->
