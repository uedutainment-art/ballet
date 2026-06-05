<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/ai

## Purpose
GPT-4o extraction layer. One Korean-tuned prompt + one normalizer + one
extractor function per domain. Also hosts the shared HTML→text fetcher
that the URL re-extract mode uses.

## Key Files
| File | Description |
|------|-------------|
| `prompts.ts` | 5 Korean-language prompts — `COMPETITION_EXTRACTION_PROMPT`, `ADMISSION_EXTRACTION_PROMPT`, `PERFORMANCE_EXTRACTION_PROMPT`, `VIDEO_EXTRACTION_PROMPT`, `ORGANIZATION_EXTRACTION_PROMPT`. Each defines a strict JSON schema |
| `extract.ts` | One extractor per domain — `extractCompetition`, `extractAdmission`, `extractPerformance`, `extractVideo`, `extractOrganization`. Each wraps OpenAI Chat Completions with `response_format: json_object`, normalizes the response, returns `{ ok, data }` or `{ ok: false, error }` |
| `fetchPageText.ts` | Best-effort fetch of an external URL → clean text. Handles EUC-KR + UTF-8, strips scripts/styles, 10s timeout, 12k char cap, returns null on failure |

## For AI Agents

### Working In This Directory
- **Model = `gpt-4o`** — vision capable + JSON mode + good Korean. Don't
  downgrade to `gpt-4o-mini` without testing — extraction quality drops
  notably for Korean ballet content.
- **Strict JSON mode** — `response_format: { type: "json_object" }` + the
  prompt MUST include "Output JSON only." Otherwise the model occasionally
  wraps the JSON in ```json``` fences.
- **`temperature: 0.1`** — low determinism. Cranking it up hallucinates dates.
- **Normalizers are strict** — each `normalize*` function returns `null` if
  required fields are missing (e.g. `name` + `host` for competition). The
  extractor turns null into `{ ok: false, error: "..." }`.
- **`asConfidence`** clamps to `[0, 1]` and falls back to `0.5` if missing.
  `asNoteMap` returns only non-empty strings.

### Testing Requirements
- For prompt edits: run a few real images through `extractFromInput` from
  the admin editor and confirm the new schema fields populate correctly
- For normalizer edits: invoke once with an intentionally bad LLM response
  to confirm graceful failure

### Common Patterns
- `extractX(input: { imageDataUrl?, supplementText? }, apiKey)` → outcome
- The image is a data URL (base64) inlined, not a Storage URL — avoids the
  IAM `signBlob` permission requirement
- `supplementText` carries either pasted text, fetched URL page text, or
  the "Existing record" context line for re-extracts

### Per-Domain Output Schemas (see prompts.ts for full)
| Domain | Required fields | Notable optional |
|---|---|---|
| competition | name, host | category enum, dates (yyyy-mm-dd), sections[], officialUrl |
| admission | schoolName, department, year | schoolType, csat, regStart/regEnd, subjects[] |
| performance | title, company | venue, dates, ticketPriceMin/Max, runtime, choreographer |
| video | title | series enum, type enum, level (L0-L4), durationSeconds, host |
| organization | name | type, region, websiteUrl, logoCandidates[] (response only) |

## Dependencies

### Internal
- None (this is the AI boundary)

### External
- `openai 6.x` — Chat Completions API with JSON mode
- `firebase-functions/logger` for structured logs
- Global `fetch` in `fetchPageText.ts` (no node-fetch)

<!-- MANUAL: -->
