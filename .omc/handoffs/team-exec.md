# Handoff: team-exec → team-verify (partial — Days 4-5 blocked)

- **Decided**: Days 1-3 of M12 keyless track completed in 4 atomic commits.
  Days 4-5 (M12-E + M11.7 activation) paused at external-key gate.
- **Rejected**: Continuing to Days 4-5 without keys — would fail at runtime
  (Resend client init throws, reCAPTCHA siteverify fails).
- **Risks**:
  1. Vercel needs `FIREBASE_SERVICE_ACCOUNT` env var for `/api/revalidate` to
     work in production. Already set if any other admin SDK code runs there;
     operator should confirm in Vercel dashboard.
  2. Sitemap now does 5 parallel Firestore reads on revalidate (every 1h);
     watch Firebase read quota if org/video collections grow.
  3. Privacy page references Resend + reCAPTCHA in 처리 위탁 table — these
     are accurate once M12-E + M11.7 ship but slightly forward-looking now.
     Operator should redact those rows if external keys are abandoned.
- **Files written** (4 commits):
  - `012d8a5` deepinit AGENTS.md hierarchy (26 docs)
  - `99e71ec` M12-A: `app/api/revalidate/route.ts`, `lib/admin/revalidate.ts`,
    `lib/admin/transitions.ts`
  - `43f813b` M12-B: `components/admin/PosterUploadSection.tsx`, storage.rules,
    competition + performance editor pages
  - `de2fc87` M12-C + M12-D: `app/sitemap.ts`, organizations detail JSON-LD,
    privacy + terms pages
- **Remaining**:
  - Day 4 M12-E (operator notifications via Resend) — needs RESEND_API_KEY
  - Day 5 M11.7 activation (submitInquiry deploy + reCAPTCHA wire) — needs
    RECAPTCHA site/secret + RESEND_API_KEY
  - Operator: set `FIREBASE_SERVICE_ACCOUNT` on Vercel if not already, submit
    sitemap to Google Search Console.

## Verification gate

- `pnpm build` ✓ after each commit
- Storage rules deployed ✓ via `firebase deploy --only storage`
- Live spot-check pending: `/privacy`, `/terms`, sitemap URL count,
  Organization JSON-LD on `/organizations/karts-dance` (background curl)
