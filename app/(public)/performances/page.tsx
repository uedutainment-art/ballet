import Link from "next/link";
import { PerformanceCard } from "@/components/public/PerformanceCard";
import { listPublishedPerformances } from "@/lib/firebase/queries";
import {
  COMPANY_TYPE_LABELS,
  type CompanyType,
} from "@/lib/types/performance";
import { cn } from "@/lib/cn";

export const revalidate = 300;

type SearchParams = { companyType?: string };

const TAB_TYPES: Array<{ key: CompanyType | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "national", label: "국립·시립" },
  { key: "private", label: "사립" },
  { key: "university", label: "대학" },
  { key: "foreign", label: "해외" },
];

function normalizeType(v?: string): CompanyType | undefined {
  if (
    v === "national" ||
    v === "private" ||
    v === "university" ||
    v === "foreign" ||
    v === "other"
  ) {
    return v;
  }
  return undefined;
}

export default async function PerformancesListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const companyType = normalizeType(searchParams.companyType);
  const items = await listPublishedPerformances({ companyType, limit: 100 });
  const activeKey: CompanyType | "all" = companyType ?? "all";

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink">
            발레 공연
          </h1>
          <p className="mt-2 text-sm text-warm-gray">
            국내외 발레 공연 일정과 티켓 정보를 한눈에 확인하세요
          </p>
        </header>

        <nav className="flex gap-1 border-b border-border overflow-x-auto -mx-2 px-2">
          {TAB_TYPES.map((t) => {
            const active = activeKey === t.key;
            const href =
              t.key === "all" ?
                "/performances" :
                `/performances?companyType=${t.key}`;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors",
                  active ?
                    "border-brand text-ink" :
                    "border-transparent text-warm-gray hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 text-sm text-warm-gray">총 {items.length}건</div>

        {items.length === 0 ? (
          <div className="mt-4 border border-dashed border-border rounded-md bg-white py-16 text-center">
            <div className="text-sm text-warm-gray">
              {companyType ?
                `${COMPANY_TYPE_LABELS[companyType]} 공연이 없어요` :
                "공개된 공연이 없어요"}
            </div>
            {companyType ? (
              <Link
                href="/performances"
                className="mt-3 inline-block text-xs text-brand hover:underline"
              >
                전체 보기 →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {items.map((p) => (
              <PerformanceCard key={p.id} performance={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
