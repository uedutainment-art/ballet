<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/types

## Purpose
Source-of-truth TypeScript types for every Firestore collection. Each domain
gets its own file containing the doc interface + enum-value label maps used
by both editors and public pages.

## Key Files
| File | Description |
|------|-------------|
| `status.ts` | `ContentStatus` 5-stage union: DRAFT / IN_REVIEW / READY / PUBLISHED / ARCHIVED |
| `user.ts` | `UserDoc` shape + `UserRole` ('EDITOR' / 'ADMIN' / 'SUPER_ADMIN') + `isAdminOrAbove()` / `isSuperAdmin()` guards |
| `editLog.ts` | `EditLog` + `EditLogDocType` ('competition' / 'admission' / 'performance' / 'video' / 'organization') |
| `competition.ts` | `Competition` doc + `CompetitionCategory` enum + `CATEGORY_LABELS` + `CATEGORY_GRADIENTS` (legacy gradient fallback) |
| `admission.ts` | `Admission` doc + `SchoolType` + `CsatReflection` + label maps + initial-letter color map |
| `performance.ts` | `Performance` doc + `CompanyType` + `COMPANY_TYPE_LABELS` + `COMPANY_GRADIENTS` (legacy) |
| `video.ts` | `Video` doc + `VideoType` ('short' / 'long' / 'live') + `VideoSeries` + `VideoLevel` (L0~L4) + label / color maps |
| `organization.ts` | `Organization` doc + `OrgType` (9 variants) + `ORG_TYPE_LABELS` + `ORG_TYPE_COLORS` + `ORG_REGIONS` + `crawlEnabled/Config/Status` (M11) |
| `crawlRun.ts` | `CrawlRun` + `CrawlOrgResult` + `CrawlRunStatus` + `CrawlTriggerType` + `CrawlDomain` + `CrawlMeta` (back-pointer attached to crawler-created DRAFTs) |
| `inquiry.ts` | M11.7 — `Inquiry` doc + `InquiryType` (5) + `InquiryStatus` (4) + `InquiryAttachment` + `InquiryContentRef` |

## For AI Agents

### Working In This Directory
- **Types use `firebase/firestore` `Timestamp`** — not `Date`. Convert at the
  boundary using `lib/format.ts` helpers (`toDate` / `formatDate`).
- **Optional fields** — use `?` not `| undefined`. Firestore docs naturally
  omit fields; required-only fields are the ones the security rule enforces.
- **Cross-domain references** — `*OrgId` is a string Firestore doc ID; the
  denormalized name (e.g. `host`, `schoolName`, `company`, `venue`) is kept
  for cheap rendering without a join. Both live in sync via OrgCombobox.
- **Enum changes are breaking** — if you remove a value from a union, every
  existing doc with that value will fail type narrowing. Migration script
  required before removing.

### Common Patterns
- Each domain exports:
  - `interface DomainName { ... }` — Firestore shape
  - `type XEnum = "a" | "b" | "c"` — string unions
  - `export const X_LABELS: Record<XEnum, string>` — UI display names
  - (optional) `X_COLORS`, `X_GRADIENTS` — visual tokens

### Cross-Domain Field Map
| Domain | Required identity | Optional Org pointer |
|---|---|---|
| Competition | name, host | hostOrgId |
| Admission | schoolName, department | schoolOrgId |
| Performance | title, company, venue | companyOrgId, venueOrgId |
| Video | title, youtubeUrl | relatedOrgIds[] |
| Organization | name, type | — (itself) |

## Dependencies

### Internal
- None (this is the bottom of the import graph)

### External
- `firebase/firestore` for `Timestamp` type

<!-- MANUAL: -->
