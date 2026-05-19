"use client";

import Link from "next/link";
import { useEffect } from "react";

// Global error boundary. Catches uncaught errors thrown anywhere inside the
// root layout's children (Server Components, Client Components, async data).
// The Next.js convention requires "use client" + the (error, reset) signature.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console so it shows in Vercel function logs / browser
    // devtools. Wire to a real error tracker (Sentry, etc.) in a later step.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-3">
          500
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-snug">
          잠시 후 다시 시도해 주세요
        </h1>
        <p className="mt-3 text-sm text-warm-gray">
          예상치 못한 오류가 발생했어요. 자동으로 보고됐고 곧 해결됩니다.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-warm-gray/70">
            오류 코드: <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center bg-brand text-white hover:bg-brand-dark transition-colors rounded-sm px-5 py-3 text-sm font-medium"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-border text-ink hover:bg-cream-start transition-colors rounded-sm px-5 py-3 text-sm"
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
