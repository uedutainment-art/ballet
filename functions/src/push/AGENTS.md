<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/push

## Purpose
Storage-trigger ingestion — the "push" channel. Fires automatically when a
file lands under `/submissions/*` in Firebase Storage (uploaded by the
public `/submit` form or by the operator's own browser via `submissions/{uid}/`).
Reads the poster bytes, hands them to GPT-4o, creates a competition DRAFT
with a Firebase-token download URL.

## Key Files
| File | Description |
|------|-------------|
| `extractFromPoster.ts` | `onObjectFinalized` trigger bound to `submissions/*`. Filters by path prefix, downloads bytes as base64 data URL, calls `extractCompetitionFromImage`, writes DRAFT competition with `firebaseStorageDownloadTokens` so the public site can render the poster |

## For AI Agents

### Working In This Directory
- **Path-prefix guard at the top** — `if (!filePath.startsWith("submissions/")) return;`
  We deploy a single Storage trigger; everything else is ignored. Without this
  the function fires on every Storage object change (logos, posters,
  thumbnails, …) and spends API quota on irrelevant files.
- **Explicit bucket** — `bucket: "ballet-d0d4c.firebasestorage.app"` in the
  function options. Storage auto-discovery picks the wrong default.
- **Inline base64 data URL** — we read the file bytes into memory and inline
  them into the OpenAI payload. Avoids needing `iam.serviceAccounts.signBlob`
  permission to mint a signed URL.
- **Download token for poster** — `randomUUID()` written to the object's
  `firebaseStorageDownloadTokens` metadata so the resulting public URL
  bypasses Storage rules (which deny anonymous read on `submissions/*`)
- **Custom metadata** captured from upload — `submittedByEmail` etc. — gets
  copied onto the doc for audit trail

### Testing Requirements
- After editing: upload a real poster via `/submit`, check Firestore for a
  new DRAFT in `competitions` with `source: "push"` + correct `posterUrl`
- Check Functions logs for `[extract] DRAFT created` log entry

### Failure Mode Tracking
- On extraction failure (non-OK API, JSON parse, missing required fields),
  the function writes an entry to `_failures/{autoId}` for triage. Editors
  can read this collection.

### Common Patterns
- Read object metadata → store on `_failures` doc on failure → still ack
  the trigger (no retry loop)

## Dependencies

### Internal
- `../ai/extract.extractCompetitionFromImage`
- `../ai/fetchPageText` (optional — supplements with the official URL page text)

### External
- `firebase-functions/v2/storage` — onObjectFinalized
- `firebase-admin/storage` — for object read + metadata write

<!-- MANUAL: -->
