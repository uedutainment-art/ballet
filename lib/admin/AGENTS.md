<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/admin

## Purpose
Editor-only helpers consumed by `/admin/*` pages. Hooks (`useAutosave`,
`useShortcuts`), shared state transitions (DRAFT → ... → PUBLISHED),
re-extract callable wrapper, blank-DRAFT creator, and the PDF→PNG client
converter used by SourcePane.

## Key Files
| File | Description |
|------|-------------|
| `transitions.ts` | 5 status-transition helpers — `transitionToInReview/Ready/Published/Archived/Hold`. Accepts optional `statusField: "status" \| "workflowState"` (orgs use the latter) |
| `useAutosave.ts` | Debounced save hook — fires `save()` 1s after the last dirty change. Exposes `{ saving, lastSavedAt, error }` |
| `useShortcuts.ts` | Keyboard shortcuts — Cmd/Ctrl+S to save, R to READY, H to hold |
| `reExtract.ts` | Client wrapper for the `extractFromInput` Cloud Function. Exports `ReExtractDomain` union + apply-mode labels |
| `createDraft.ts` | `createBlankDraft(domain, uid)` — used by `NewDraftButton`. Per-domain sensible defaults so editor opens with valid form state |
| `pdfToImage.ts` | Client-side PDF→PNG via `pdfjs-dist` worker. Renders first page; used by SourcePane PDF tab |

## For AI Agents

### Working In This Directory
- **`useAutosave` is per-doc** — the `changeMarker` arg should be a stable
  string (we use `JSON.stringify(watched)`). If you pass a new ref each
  render the hook will save in a hot loop.
- **Status transitions take a Ctx** — `{ id, docTitle, fromStatus, collection, docType }`.
  The `collection` string is the Firestore collection ("competitions" etc.).
  Orgs add `statusField: "workflowState"` because they have both an ACTIVE
  flag AND a workflow state.
- **`createDraft` lives here, not in queries** — it writes via the user's
  Firebase web SDK auth, which goes through Firestore rules (editors only).
- **PDF worker** — `pdfjs-dist` needs the worker file. Configured globally
  in `pdfToImage.ts` to load from `public/` or unpkg fallback.

### Testing Requirements
- After editing `transitions.ts`: walk a DRAFT through every transition in
  the admin UI, confirm Firestore `status` field flips + `editLogs` entry
  appears
- After `useAutosave`: change a field, count network requests in DevTools
  (should be exactly 1 after a 1s pause, not N per keystroke)

### Common Patterns
- Editor pages compose: `useForm` + `useAutosave({ changeMarker, dirty, save })`
  + `useShortcuts({ onSave, onReady, onHold })` + 4-5 `runTransition` callbacks
- `runTransition` wraps `transitions.ts` helpers with toast + busy state

## Dependencies

### Internal
- `@/lib/firebase/client` for `db` + `functions`
- `@/lib/firebase/editLogs` for `recordEdit`
- `@/lib/types/status`, `@/lib/types/editLog`

### External
- `firebase` web SDK
- `pdfjs-dist 5.x`

<!-- MANUAL: -->
