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
        <div className="mt-8 pt-6 border-t border-border space-y-2 text-[11px] text-warm-gray/80">
          <div>© 2026 K BALLET &amp; CO. · created by 포올</div>
          <div className="leading-relaxed">
            K BALLET에 표시된 각 기관의 로고와 상표는 해당 기관의 자산입니다.
            식별·정보 제공 목적으로 사용되며,{" "}
            <Link
              href="/contact"
              className="text-brand hover:underline"
            >
              /contact 페이지
            </Link>
            로 삭제·수정을 요청해 주시면 1~3일 내 반영합니다. 직접 문의:{" "}
            <a
              href="mailto:uedutainment@gmail.com"
              className="hover:text-ink"
            >
              uedutainment@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
