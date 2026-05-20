# Inquiry function — activation checklist (M11.7-3)

Code is written but **NOT** yet exported from `functions/src/index.ts`. Activate
after the external service keys are ready.

## Step 1 — set Firebase secrets

```bash
# reCAPTCHA v3
pnpm exec firebase functions:secrets:set RECAPTCHA_SECRET_KEY
# paste the secret value when prompted

# Resend
pnpm exec firebase functions:secrets:set RESEND_API_KEY
# paste the API key when prompted
```

## Step 2 — add the public reCAPTCHA site key to Vercel + .env.local

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc...
```

(Apply to both the local `.env.local` and the Vercel project Environment
Variables UI.)

## Step 3 — wire the reCAPTCHA token client-side

In `app/(public)/contact/page.tsx`, before calling `submitInquiry`, load the
reCAPTCHA v3 script and call `grecaptcha.execute(siteKey, { action: 'inquiry' })`,
then pass the resulting token as `recaptchaToken` in the payload.

The function tolerates a missing token while the secret is also missing —
once `RECAPTCHA_SECRET_KEY` is set, the token becomes mandatory.

## Step 4 — verify the Resend sending domain

- Add the DNS records Resend gives you for `kballet.kr`
- Or accept the fallback path (the function retries with `onboarding@resend.dev`
  if the verified-from address is rejected)

## Step 5 — export + deploy

```ts
// functions/src/index.ts
export { submitInquiry } from "./inquiry/submitInquiry";
```

```bash
pnpm exec firebase deploy --only functions:submitInquiry
```

## Step 6 — smoke test from /contact

Submit a real test inquiry. Confirm:

- Doc appears in `/inquiries` collection
- If you supplied an email, an acknowledgment lands within 30s
- `uedutainment@gmail.com` receives the admin notification
- Re-submitting 4× within a minute returns the rate-limit error
