# Handoff: team-plan → team-exec

- **Decided**: Sequential execution by lead (0 spawned workers). 6 sub-steps (M12-A/B/C/D/E + M11.7) decomposed into 2 tracks — keyless (A/B/C/D) and external-key-dependent (E + M11.7). Days 1-3 keyless track runs now; days 4-5 paused until reCAPTCHA + Resend keys ready.
- **Rejected**: Spawning 3+ parallel workers — task coupling on editor pages (M12-A + M12-B both touch FieldsPanes) + lead has full session context + each sub-step is <1 day. Orchestration overhead > parallelism gain. Tmux CLI workers similarly inappropriate (small UI tweaks).
- **Risks**: (1) M12-A revalidate API needs env var on Vercel — operator must set `REVALIDATE_SECRET` after first deploy. (2) Storage rules for poster uploads already allow `posters/*` only as functions-write — need new rule for editor uploads. (3) JSON-LD additions to detail pages may trip Lighthouse if schema invalid.
- **Files**: Handoff only at this stage. Next handoff at team-exec → team-verify.
- **Remaining**: Day 1 starts now. After Day 3 (M12-D), pause + report status + request external keys.

## Execution sequence (lead-driven)

| Day | Step | Files touched | Verify gate |
|---|---|---|---|
| 1 | M12-A revalidation | `app/api/revalidate/route.ts` (NEW), `lib/admin/transitions.ts`, optional doc update | Live: publish → check home cache flushes immediately |
| 2 | M12-B poster upload | `components/admin/PosterUploadSection.tsx` (NEW), `FieldsPane.tsx`, `PerformanceFieldsPane.tsx`, `storage.rules` | Live: upload poster via editor → cards show it |
| 3a | M12-C SEO | `app/sitemap.ts`, `app/(public)/{organizations,admissions}/[id]/page.tsx` JSON-LD | curl sitemap, validate JSON-LD |
| 3b | M12-D policy | `app/(public)/{privacy,terms}/page.tsx` (NEW), `components/public/Footer.tsx` | Pages 200, footer links visible |
| 4 | M12-E notifications | **BLOCKED** on Resend key + sending email setup | After unblock |
| 5 | M11.7 activation | **BLOCKED** on reCAPTCHA + Resend keys | After unblock |
