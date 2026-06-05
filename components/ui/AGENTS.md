<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components/ui

## Purpose
Primitive UI building blocks. Tiny, unopinionated wrappers around native
HTML elements with K BALLET tokens baked in (brand colors, border, padding,
focus ring). No state, no app coupling.

## Key Files
| File | Description |
|------|-------------|
| `Button.tsx` | `<Button variant="primary"\|"ghost"\|"text" size="sm"\|"md"\|"lg">`. forwardRef + button props passthrough |
| `Input.tsx` | Exports 3 primitives — `<Input>` (text/url/email/number), `<Textarea>`, `<Select>`. All share `fieldBase` styling |
| `Card.tsx` | Padded card container (used by a few admin tiles) |
| `Badge.tsx` | Inline status badge — used by domain queue rows |

## For AI Agents

### Working In This Directory
- **Server-safe** — these are pure presentational; no `"use client"` needed
- **forwardRef everywhere** — required so react-hook-form's `register()` can
  attach refs to native inputs
- **Token discipline** — colors come from `tailwind.config.ts` extended palette
  (`bg-brand`, `text-ink`, `bg-cream-start`, `border-border`). Don't introduce
  arbitrary hex values — go through the config.
- **Tiny on purpose** — if a primitive starts growing complex behavior, lift
  it out into `components/admin/` or `components/public/`

### Testing Requirements
- Compile via `pnpm build` — any breaking change here cascades to every form

### Common Patterns
- Variant classes via a `Record<Variant, string>` map, then `cn(base, map[variant])`
- Size classes via same pattern
- All accept `className` last (merge with cn so callers can override)

## Dependencies

### Internal
- `@/lib/cn` — class merging

### External
- React, no other deps

<!-- MANUAL: -->
