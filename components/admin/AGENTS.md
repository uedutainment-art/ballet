<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components/admin

## Purpose
Editor + queue components used inside `/admin`. Every domain shares the same
shell — a left `SourcePane` (re-extract from image/PDF/URL/text) + a right
`XFieldsPane` (form built on react-hook-form + zod). Auxiliary components
cover status transitions, autosave indicators, source provenance badges,
organization combobox, logo upload, bulk URL add, crawler config, and the
admin sidebar.

## Key Files
| File | Description |
|------|-------------|
| `Sidebar.tsx` | Admin shell nav — 대시보드 / 콩쿠르 / 입시 / 공연 / 영상 / 기관 / 자동수집 / 제보 / 승인 큐 / 사용자 관리 + 미처리 배지 |
| `SourcePane.tsx` | Re-extract panel — 4 input modes (image / PDF / URL / text) × 3 apply modes. Routes by `target.domain` |
| `FieldsPane.tsx` | Competition editor right-pane (with OrgLinkRow for host) |
| `AdmissionFieldsPane.tsx` | Admission editor right-pane (with OrgLinkRow for school) |
| `PerformanceFieldsPane.tsx` | Performance editor right-pane (with OrgLinkRows for company + venue) |
| `VideoFieldsPane.tsx` | Video editor — 12 fields incl. relatedX CSVs + level (optional) |
| `OrgFieldsPane.tsx` | Organization editor — 4 sections (basic / classification / contact / extras) + logo slot |
| `OrgLogoSection.tsx` | Logo block: current preview + AI candidate thumbs + manual upload |
| `OrgCrawlSection.tsx` | M11 crawler config: toggle + 3 board URLs + exclude regex + UA + status block + "지금 크롤" |
| `OrgCombobox.tsx` | Autocomplete picker — searches name/shortName/aliases. Inline "+ 새 기관" |
| `OrgLinkRow.tsx` | Drop-in row used by FieldsPanes to link a denormalized name → orgId via OrgCombobox |
| `BulkAddOrgsModal.tsx` | URL list → DRAFT orgs (max 25) → background AI extract loop |
| `StatusBadge.tsx` | Color-coded badge for the 5-stage workflow |
| `StatusTransitionBar.tsx` | Bottom action bar: 저장 / READY / PUBLISH / 보류 / 보관 |
| `SourceBadge.tsx` | 🤖 자동수집 / 📮 익명 / ✏ 수동 — used in queue rows |
| `NewDraftButton.tsx` | Shared "+ 신규 등록" button used by 4 domain list pages |
| `ConfidenceMeter.tsx` | Small horizontal meter showing AI extraction confidence |
| `HealthDot.tsx` | 4-state crawler health signal (INACTIVE / GREEN / YELLOW / RED) |

## For AI Agents

### Working In This Directory
- **All files need `"use client"`** — they use hooks (useState, useEffect,
  useFormContext, useAuth)
- **FieldsPanes must be inside `<FormProvider>`** — the editor page sets up
  `useForm()` and wraps its children
- **SourcePane is generic** — the parent passes a `target: SourcePaneTarget`
  with `domain` + domain-specific fields (posterUrl / youtubeId / logoUrl /
  primaryLabel). The pane renders the right "current reference" preview
  and calls `extractFromInput` Cloud Function with the matching `domain`.
- **AutosaveIndicator** lives inside FieldsPane headers — consumes
  `AutosaveStatus` from `lib/admin/useAutosave`
- **OrgLinkRow** uses generic `<T extends FieldValues>` so each FieldsPane
  binds it to its own form values type

### Testing Requirements
- After editing any FieldsPane: open the editor, change every field type,
  watch autosave indicator flip 저장 중 → 저장됨
- After editing SourcePane: try each of 4 input modes against a real DRAFT
- Re-extract logs land in `editLogs` collection — verify the entry appears

### Common Patterns
- Field rows use a small `<Field label note error highlighted>` wrapper
  defined locally in each FieldsPane (intentional duplication for now)
- "Recently updated by AI" highlight: green halo for ~1.5s on form fields
  that just got rewritten by re-extract
- `FIRESTORE_TO_FORM` mapping inside each FieldsPane translates re-extract's
  Firestore field names (e.g. `sections`) to form field names (`sectionsCsv`)

## Dependencies

### Internal
- `@/lib/admin/*` — useAutosave, transitions, reExtract, useShortcuts, createDraft
- `@/lib/firebase/*` — client + queries
- `@/lib/types/*` — domain types
- `@/lib/utils/youtube` — for VideoFieldsPane
- `@/components/ui/*` — Button, Input, Select, Textarea

### External
- react-hook-form 7.x + @hookform/resolvers + zod 4.x
- lucide-react (Loader2, AlertTriangle, Sparkles, Play, Upload, …)
- firebase web SDK for direct doc updates

<!-- MANUAL: -->
