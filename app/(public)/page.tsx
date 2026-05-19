// Brand placeholder for the public landing route ("/").
// All styling via Tailwind tokens defined in tailwind.config.ts.

export default function Home() {
  return (
    <section className="flex-1 flex items-center justify-center bg-cream py-24 px-6">
      <div className="text-center max-w-xl">
        <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-4">
          K BALLET &amp; CO.
        </div>
        <h1 className="m-0 text-4xl font-serif font-medium text-ink leading-[1.35]">
          발레의 모든 정보,
        </h1>
        <h1 className="m-0 text-4xl font-serif font-medium italic text-gold leading-[1.35]">
          한 곳에서.
        </h1>
        <p className="mt-4 text-sm text-warm-gray">
          콩쿠르 · 입시 · 공연 정보를 매주 새로 정리해 드립니다
        </p>
        <p className="mt-8 text-xs tracking-wider text-warm-gray/60">
          coming soon · 곧 만나요
        </p>
      </div>
    </section>
  );
}
