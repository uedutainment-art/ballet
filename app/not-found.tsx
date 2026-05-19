import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-3">
          404
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-snug">
          찾으시는 페이지가 없어요
        </h1>
        <p className="mt-3 text-sm text-warm-gray">
          주소가 잘못되었거나, 페이지가 이동·삭제되었을 수 있어요.
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
