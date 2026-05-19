import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-3">
          403
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-snug">
          운영자 권한이 필요해요
        </h1>
        <p className="mt-3 text-sm text-warm-gray">
          이 페이지는 EDITOR 이상의 권한이 있는 운영자만 접근할 수 있어요.
          접근 권한이 필요하면 관리자에게 문의해 주세요.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-6 bg-brand text-white hover:bg-brand-dark transition-colors rounded-sm px-5 py-3 text-sm font-medium"
        >
          홈으로 가기
        </Link>
      </div>
    </main>
  );
}
