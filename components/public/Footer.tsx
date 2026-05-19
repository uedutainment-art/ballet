import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-cream-start text-warm-gray">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="font-serif text-base text-ink">
              K BALLET &amp; CO.
            </div>
            <p className="mt-2 text-xs">발레의 모든 정보, 한 곳에서.</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <li>
              <Link
                href="/about"
                className="hover:text-ink transition-colors"
              >
                운영자 정보
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-ink transition-colors"
              >
                이용약관
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="hover:text-ink transition-colors"
              >
                개인정보
              </Link>
            </li>
            <li>
              <a
                href="mailto:uedutainment@gmail.com"
                className="hover:text-ink transition-colors"
              >
                문의
              </a>
            </li>
          </ul>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-[11px] text-warm-gray/80">
          © 2026 K BALLET &amp; CO. · created by 포올
        </div>
      </div>
    </footer>
  );
}
