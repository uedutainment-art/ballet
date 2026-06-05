<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/organization

## Purpose
Server-side actions specific to organizations. Currently a single function —
`downloadOrgLogo` — that fetches a third-party logo URL, validates the bytes,
uploads to Firebase Storage under `organizations/{orgId}/`, and writes the
Storage URL back to the org doc. Triggered from the admin LogoSection when
the operator clicks an AI-suggested candidate.

## Key Files
| File | Description |
|------|-------------|
| `downloadLogo.ts` | `downloadOrgLogo` onCall — accepts `{ orgId, sourceUrl }`. Validates: editor+ role, https/http only, image content-type, 2MB cap, 5s timeout, KBalletBot User-Agent. Uploads with `firebaseStorageDownloadTokens` + `posterSourceUrl` metadata for audit. Updates `org.logoUrl` + `org.logoSourceUrl` |

## For AI Agents

### Working In This Directory
- **Explicit bucket** — `getStorage().bucket("ballet-d0d4c.firebasestorage.app")`.
  Auto-discovery picks the wrong default for `firebasestorage.app` domain
  projects.
- **2MB cap is enforced server-side** even though the client also caps —
  defense in depth. Reject larger files with `HttpsError("invalid-argument")`.
- **Content-type check** — must start with `image/`. Don't allow `text/html`
  through (defends against typosquatted URLs that return HTML).
- **5s fetch timeout** via `AbortController` — slow third-party servers
  shouldn't block other operators.
- **Audit trail** — every uploaded file carries `posterSourceUrl` +
  `downloadedAt` + `orgId` in its Storage object custom metadata. Inspectable
  via Storage console.
- **Token URL** — `firebaseStorageDownloadTokens` random UUID written to
  metadata. The returned `logoUrl` includes `?alt=media&token=...` so
  it bypasses Storage rules (Storage `/organizations/*` is public-read +
  authenticated-write).

### Testing Requirements
- After deploy: open an org editor → run "AI 분석" with a URL → click an
  AI logo candidate → confirm Storage has the new object + org doc updated
- Try a non-image URL → confirm graceful error toast in the UI

### Common Patterns
- Same Storage path scheme as performance posters: `<collection>/<docId>/<asset>.<ext>`
- Update mirrors: `logoUrl` + `logoSourceUrl` + `lastUpdatedAt` + `updatedAt`

### Future
- A similar `downloadPerformancePoster` callable could replace the one-off
  `scripts/seed-bfk-2026.ts` poster grab. Same shape, different collection.

## Dependencies

### Internal
- None (talks to Firestore + Storage directly)

### External
- `firebase-functions/v2/https` — onCall + HttpsError
- `firebase-admin/storage`, `firebase-admin/firestore`
- Node 20 `fetch` + `AbortController` + `node:crypto.randomUUID`

<!-- MANUAL: -->
