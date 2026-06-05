<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/zod

## Purpose
Form-level zod schemas — one per domain. Bridge between Firestore doc shape
(`lib/types/*`) and react-hook-form values (the latter use ISO date strings
+ comma-separated arrays for friendlier inputs). Each schema is consumed by
the matching admin editor via `zodResolver(schema)`.

## Key Files
| File | Description |
|------|-------------|
| `competition.ts` | `competitionFormSchema` + 3 `.refine()` cross-field rules (dateEnd ≥ dateStart, regEnd ≤ dateStart, regStart ≤ regEnd) |
| `admission.ts` | `admissionFormSchema` + 2 refines (regStart ≤ regEnd, practical1 ≤ practical2). `csat` enum + `schoolOrgId` optional |
| `performance.ts` | `performanceFormSchema` + 2 refines (dateEnd ≥ dateStart, priceMax ≥ priceMin). `companyOrgId` + `venueOrgId` optional |
| `video.ts` | `videoFormSchema` + custom YouTube URL refine. `level` accepts `""` to match the Select empty option (formToPatch strips it) |
| `organization.ts` | `organizationFormSchema` — identity + classification + contact + social + crawl fields (M11). `email` optional with `.or(z.literal(""))` |
| `inquiry.ts` | M11.7 — `inquiryFormSchema` for the /contact form. Validates 5 types + 200/3000-char limits + email + agreement checkbox |

## For AI Agents

### Working In This Directory
- **zod 4 quirks** — `z.number({ invalid_type_error: ... })` options bag is
  deprecated; use plain `z.number()`. For optional numbers that come from
  text inputs, the pattern is
  `.or(z.nan().transform(() => undefined))`.
- **Empty-string sentinel for optional enums** — when a Select's empty
  option emits `""`, include it in the enum (e.g. `level: z.enum(["", "L0", ...])`).
  The editor's `formToPatch` then skips writing the field when `""`. Trying
  to mix `.optional()` + `.or(z.literal(""))` confuses Resolver type inference.
- **URLs** — required URLs use `.url()`. Optional URLs use
  `.refine((v) => !v || /^https?:\/\//.test(v), "...")` to allow `""`.
- **Cross-field validation** lives at the schema bottom in `.refine()`. Mark
  the offending field via `path: ["fieldName"]` so the error renders inline.
- **CSV pattern** — array fields that need free-form text input become
  `xxxCsv: z.string().optional()` in the form, split at the boundary in
  `formToPatch`. Keeps the input UX simple without losing array semantics.

### Testing Requirements
- After adding a field, exercise the editor: empty → error highlights,
  filled → validates, autosave runs

### Common Patterns
- Required free text: `z.string().min(1, "필수예요").max(120)`
- Required enum: `z.enum(["a","b","c"])`
- Optional date string (yyyy-mm-dd): `z.string().optional()` — date validation
  via the cross-field refines, not at field level
- Optional integer from text input:
  ```ts
  z.number().int().nonnegative().optional().or(z.nan().transform(() => undefined))
  ```

## Dependencies

### Internal
- `@/lib/utils/youtube` for `extractYoutubeId` in `video.ts`

### External
- `zod 4.4+`

<!-- MANUAL: -->
