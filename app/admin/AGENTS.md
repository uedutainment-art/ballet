<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# admin

## Purpose
Operator workspace. Every page here is client-rendered, gated by Firebase
Auth (redirects to `/admin/login` on no-user), and gated by role
(`EDITOR` / `ADMIN` / `SUPER_ADMIN`). Sidebar navigation, 5-stage workflow
queues, dual-pane editors with SourcePane + FieldsPane.

## Key Files
| File | Description |
|------|-------------|
| `layout.tsx` | Renders Sidebar + checks auth + redirects unauthed users to login |
| `page.tsx` | Dashboard — recent edit logs, counts by status across domains, AI run pointer |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `login/` | Email/password + Google sign-in. Sets the auth cookie + redirects to `/admin` |
| `competitions/` | List + editor for /competitions DRAFTs/PUBLISHEDs |
| `admissions/` | List + editor for /admissions |
| `performances/` | List + editor for /performances |
| `videos/` | List + editor for /videos |
| `organizations/` | List + editor — also hosts crawler config + logo upload + bulk-add modal |
| `crawl-runs/` | M11 — pull crawler execution history; list + per-run detail |
| `inquiries/` | M11.7 — inquiry queue + per-inquiry detail with convertToDraft action |
| `queue/` | Cross-domain READY queue for the "공개 승인" step (ADMIN gated) |

## For AI Agents

### Working In This Directory
- **Auth pattern** — every page uses `useAuth()` from `@/components/providers/AuthProvider`.
  Loading state shows "불러오는 중…"; no-user state redirects to login.
- **Role gating** — `isAdminOrAbove(role)` / `isSuperAdmin(role)` from
  `@/lib/types/user`. Editors can edit; admins approve; super admins manage
  user roles.
- **Editor layout** — every domain `[id]/page.tsx` is a near-clone:
  - `useForm({ resolver: zodResolver(schema) })` + `<FormProvider>`
  - `useAutosave` triggers `save()` 1s after the last change
  - Status transitions via `lib/admin/transitions.ts` helpers
  - Left pane = `<SourcePane>` (re-extract); right pane = `<XFieldsPane>`
- **Status transitions** are gated:
  - editors push DRAFT → IN_REVIEW (auto on first edit) → READY
  - admins push READY → PUBLISHED
  - anyone with edit rights can ARCHIVE
  - organizations use `workflowState` instead of `status`

### Testing Requirements
- After any editor change, manually walk DRAFT → READY → PUBLISHED to verify
  the autosave + transitions still work
- Check the queue lists update (counts re-fetch on mount)
- Confirm the editor's SourcePane re-extract still calls the right Function
  (e.g. competition domain hits `extractFromInput` with `domain: "competition"`)

### Common Patterns
- Tabs at top of each list: DRAFT / IN_REVIEW / READY / PUBLISHED / ARCHIVED
- "신규 등록" button via `<NewDraftButton domain="..." />` from
  `@/components/admin/NewDraftButton` — calls `createBlankDraft()` and
  routes to the editor immediately

## Dependencies

### Internal
- `@/components/admin/*` — every editor + queue UI
- `@/lib/firebase/admin-queries` — counts + by-status listings
- `@/lib/admin/transitions` — status workflow
- `@/lib/admin/createDraft` — shared "new blank" payload

### External
- Firebase Auth web SDK
- react-hook-form + zod + @hookform/resolvers

<!-- MANUAL: -->
