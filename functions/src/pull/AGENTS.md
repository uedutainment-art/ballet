<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/pull

## Purpose
M11 pull crawler — Firestore-driven, organization-keyed. Replaces the
legacy `sources.ts` hardcoded list. Every week (Monday 08:00 KST) walks
`organizations` where `crawlEnabled === true && status === "ACTIVE"`,
dispatches per-domain board URLs to per-article AI extraction, and books
everything against a single `crawlRuns` doc.

## Key Files
| File | Description |
|------|-------------|
| `scheduler.ts` | `pullCrawlerScheduled` — `onSchedule` cron Mon 08:00 KST. Calls `runAllCrawls({ triggerType: "SCHEDULED" })` |
| `runner.ts` | `runAllCrawls({ triggerType, triggeredBy, apiKey, onlyOrgIds? })` — shared by scheduler + manual triggers. Loads orgs, iterates over per-domain board URLs, accumulates results |
| `orgCrawler.ts` | `runCrawlForOrg(params)` — fetch board → cheerio extract article links → dedupe vs seen-hash ring → fetch each article → domain-extract → write DRAFT with `crawlMeta`. Per-org-per-domain cap `MAX_NEW_PER_DOMAIN = 8` |
| `crawlRun.ts` | Bookkeeping helpers — `createCrawlRun`, `recordOrgResult` (transactional append), `finishCrawlRun`, `updateOrgCrawlStatus` (rotates seenUrlHashes ring at 500) |
| `manualTrigger.ts` | 3 callables — `pullCrawlerManual` (ADMIN; runs every enabled org), `triggerCrawlForOrg` (EDITOR; single org), `resetOrgSeenHashes` (EDITOR; clears the dedup ring) |

## For AI Agents

### Working In This Directory
- **Adding an article-link heuristic**: edit `extractArticleLinks` in
  `orgCrawler.ts`. Current heuristic: `<a href>` + same-host (or any
  http(s) with text length ≥ MIN_LINK_TEXT_LENGTH) + at least one path
  segment + skip mailto/javascript/fragment-only.
- **Adding a new domain to the crawler** would require routing in the
  `runDomainExtractor` switch + a new `buildXDraft` function. Currently
  3 domains supported: competition, admission, performance. Video isn't
  crawled (handled separately via the admin form).
- **`seenUrlHashes` ring** — capped at 500 entries via
  `updateOrgCrawlStatus` to keep doc size bounded. Hash = first 16 chars
  of SHA-256 of lowercased trimmed URL.
- **Per-org failures don't abort the run** — `runCrawlForOrg` always
  resolves with a `CrawlOrgResult` (even on error). The scheduler keeps
  going for the next org.
- **AI cost guardrail** — `MAX_NEW_PER_DOMAIN = 8` per org per domain.
  Even if 200 unseen URLs exist on a board, only 8 get article-fetched +
  AI-extracted per run.

### Testing Requirements
- After editing: trigger `pullCrawlerManual` from `/admin/crawl-runs`
  ("지금 전체 크롤" admin-only button). Confirm a new `crawlRuns` doc
  appears with per-org results.
- For `orgCrawler.ts` edits: pick one org with a working board URL,
  use the editor's "지금 크롤" button to run a single-org cycle.
- Check Function logs for `[orgCrawler] DRAFT created` entries.

### Common Patterns
- All 4 board URLs (`competitionBoardUrl` / `admissionBoardUrl` /
  `performanceBoardUrl`) are optional; the runner just skips when missing
- `crawlMeta` back-pointer on every DRAFT — surfaces the source org +
  original article URL in the editor's source badge
- Idempotency = dedupe via seenUrlHashes; same article URL won't
  re-extract until the operator calls `resetOrgSeenHashes`

### Pitfalls
- Some Korean sites serve EUC-KR or block User-Agents — operator can
  override via `crawlConfig.userAgent` on the org doc
- Some boards are JavaScript-rendered; cheerio sees no article links.
  No client-side rendering in the crawler (would be too expensive).
  Document in org's `notes` field if the site falls in this bucket.

## Dependencies

### Internal
- `../ai/extract` — `extractCompetition`, `extractAdmission`, `extractPerformance`
- `firestore-admin` directly for queries

### External
- `cheerio 1.x` — HTML parsing
- `firebase-functions/v2/scheduler` + `onCall`
- Node 20 global `fetch` + `AbortController`

<!-- MANUAL: -->
