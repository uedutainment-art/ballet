// Canonical site URL used by metadata, robots, sitemap, and OG tags.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL env var (set in Vercel dashboard once a custom
//      domain is configured)
//   2. Production Vercel URL fallback
//
// The current value lives in .env.local and on Vercel — change there to
// promote a custom domain later.

const FALLBACK = "https://ballet-kappa.vercel.app";

const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const SITE_URL = raw && /^https?:\/\//.test(raw) ? raw : FALLBACK;

export const SITE_NAME = "K BALLET & CO.";
export const SITE_TAGLINE = "발레의 모든 정보, 한 곳에서.";
export const SITE_DESCRIPTION =
  "발레 콩쿠르 · 입시 · 공연 정보를 한 곳에서. AI가 1차 정리하고 운영자가 검수합니다.";
