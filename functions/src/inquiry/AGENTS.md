<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# functions/src/inquiry

## Purpose
M11.7 inquiry intake. Public `/contact` form submits via callable function
which: verifies reCAPTCHA v3 + IP-hash rate limits + zod schema → uploads
attachment to Storage (if any) → writes the `inquiries` doc → sends
acknowledgment email + admin notification via Resend. Currently **not
exported** from `functions/src/index.ts` — see README — pending the
operator's reCAPTCHA + Resend keys.

## Key Files
| File | Description |
|------|-------------|
| `submitInquiry.ts` | `submitInquiry` onCall (deferred export). reCAPTCHA verify → rate limit (3/min, 20/hr per IP hash) → upload attachment with download token → write `/inquiries/{id}` → fire-and-forget email send → notify admins |
| `README.md` | 6-step activation checklist for when reCAPTCHA + Resend keys land |

## For AI Agents

### Working In This Directory
- **Currently dormant** — `index.ts` does NOT re-export `submitInquiry`.
  The `/contact` form gracefully degrades to a "기능 준비 중" message via
  the `functions/unavailable` error code branch.
- **Three required secrets** before enabling:
  - `RECAPTCHA_SECRET_KEY` (Google reCAPTCHA v3 secret)
  - `RESEND_API_KEY` (Resend transactional email)
  - Client-side `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` env var in Vercel
- **Storage layout** — attachments at `inquiries/{inquiryId}/{filename}`.
  Storage rule denies anonymous read; admin reads via the editor UI which
  uses authenticated download token URL.
- **Rate limit collection** — `/rateLimits/{ipHash}` keyed by SHA-256 of
  the client IP. Stores a `events[]` array of recent timestamps. Pruned
  to ≤1 hr window each call.
- **Fail-soft email** — if Resend returns an error, the inquiry is still
  written (operator can read it from `/admin/inquiries`). The error is
  logged but doesn't surface to the submitter.

### Testing Requirements
- Once keys are wired: submit a real inquiry from `/contact` → check
  `inquiries` doc + Resend dashboard + admin queue badge
- Rate limit: submit 4 inquiries in a minute → 4th should be rejected
- reCAPTCHA: open DevTools, edit the token to junk → server returns
  `failed-precondition`

### Activation Path
1. Operator gets reCAPTCHA site/secret + Resend API key + (optional) custom domain
2. `pnpm exec firebase functions:secrets:set RECAPTCHA_SECRET_KEY`
3. `pnpm exec firebase functions:secrets:set RESEND_API_KEY`
4. Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to Vercel env vars
5. Add `export { submitInquiry } from "./inquiry/submitInquiry";` to `src/index.ts`
6. `pnpm exec firebase deploy --only functions:submitInquiry`
7. Wire `grecaptcha.execute(...)` token grab into the `/contact` form submit

## Dependencies

### Internal
- `@/lib/types/inquiry` — same shape used by client form + admin queue

### External (will be added when enabled)
- `resend` SDK (not currently installed; add when keys land)
- Built-in `fetch` for reCAPTCHA siteverify

<!-- MANUAL: -->
