<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/extract

## Purpose
The single multi-input AI re-extract callable — the "AI 분석 시작" button
in the editor's SourcePane hits this. Accepts 4 input modes (image / PDF
data URL / URL / pasted text) × 3 apply modes (overwrite / fill_empty /
higher_confidence) × 5 domains. Loads the existing doc, runs the matching
extractor, computes a per-field diff against the configured apply mode,
writes the patch + an `editLogs` entry.

## Key Files
| File | Description |
|------|-------------|
| `extractFromInput.ts` | `extractFromInput` onCall. ~470 lines. Routes by `domain` to the matching `extractX` function from `../ai/extract`. Handles per-domain field allow-lists (`EXTRACTABLE_FIELDS_BY_DOMAIN`), date parsing (`DATE_FIELDS_BY_DOMAIN`), collection resolution (`COLLECTION_BY_DOMAIN`), and merge semantics |

## For AI Agents

### Working In This Directory
- **Adding a new domain** requires editing 5 things in this file:
  1. The `Domain` union at the top
  2. `EXTRACTABLE_FIELDS_BY_DOMAIN[<domain>]` — fields that can be overwritten
  3. `DATE_FIELDS_BY_DOMAIN[<domain>]` — fields that need yyyy-mm-dd parsing
  4. `COLLECTION_BY_DOMAIN[<domain>]` — Firestore collection name
  5. The `runExtractor` switch case
- **Apply mode semantics**:
  - `overwrite` — replace every populated extracted field
  - `fill_empty` — only write where existing field is empty (default)
  - `higher_confidence` — overwrite if new extraction's confidence > old
- **`socialLinks` for orgs** — flattened by the AI (`instagramUrl` etc.)
  then merged back into the nested `socialLinks` map at write time. Special
  case in `mergeWithMode`.
- **`logoCandidates` for orgs** — returned in the response but NOT written
  to Firestore. The admin LogoSection consumes them transiently to pick
  one for download.

### Testing Requirements
- After adding a domain: walk an `image`, `pdf`, `url`, `text` mode through
  the admin editor SourcePane, confirm fields populate + `editLogs` entry
  shows `재추출 (<domain>, <mode>, <applyMode>)` note
- Validate the empty-fields edge case — `applyMode=fill_empty` should not
  clobber editor's manual edits

### Common Patterns
- Authentication wall at the top: `req.auth?.uid` + Firestore role check
- Existing doc fetched first → used to:
  - reject non-existent docs
  - build the "Existing record being updated" context line for the LLM
  - compute the merge against the operator's edits
- Patch written via `docRef.update(patch)` — only changed fields
- `editLogs` collection entry written via the function's own Admin SDK
  (NOT the client `recordEdit` helper)

## Dependencies

### Internal
- `../ai/extract` — all 5 extractor functions + their result types
- `../ai/fetchPageText` — for URL input mode

### External
- `firebase-functions/v2/https` — onCall + HttpsError
- `firebase-admin/firestore` — FieldValue, Timestamp

<!-- MANUAL: -->
