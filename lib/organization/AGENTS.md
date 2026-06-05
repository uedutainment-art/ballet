<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# lib/organization

## Purpose
Organization-specific business logic that doesn't fit in `types/` or
`queries.ts`. Currently a single module — the M11 crawler health signal.

## Key Files
| File | Description |
|------|-------------|
| `health.ts` | `computeHealth(org)` → INACTIVE / GREEN / YELLOW / RED. Plus `HEALTH_COLORS` + `HEALTH_LABELS` maps used by the admin list + signal-dot UI |

## For AI Agents

### Working In This Directory
- **`computeHealth` is pure** — pass an `Organization` doc, get a string.
  Safe to call in render.
- **State logic** —
  - `crawlEnabled === false` → INACTIVE
  - never succeeded → RED
  - 3+ consecutive failures OR last success >30 days ago → RED
  - 1+ recent failure OR last success >7 days ago → YELLOW
  - otherwise GREEN
- **Don't tighten the thresholds without sample data** — the org list filter
  is the main consumer; flipping a lot of orgs to YELLOW/RED makes the
  filter noisy

### Testing Requirements
- Verify by toggling `crawlEnabled` + injecting `crawlStatus.lastSuccessAt`
  values via a temp script
- `/admin/organizations` filter chips should match expected populations

### Adding Logic
- New per-org derived state goes here (e.g. cost-this-month, average
  confidence). Keep these pure + import-light.

## Dependencies

### Internal
- `@/lib/types/organization`

### External
- None

<!-- MANUAL: -->
