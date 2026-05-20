import Link from "next/link";
import { CompetitionCard } from "@/components/public/CompetitionCard";
import { FilterBar } from "@/components/public/FilterBar";
import { listPublishedCompetitions } from "@/lib/firebase/queries";
import type { CompetitionCategory } from "@/lib/types/competition";

export const revalidate = 300;

type SearchParams = {
  category?: string;
  period?: string;
  search?: string;
};

function periodToRange(period?: string): { from?: Date; to?: Date } {
  if (!period) return {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "this_week") {
    const to = new Date(start);
    to.setDate(to.getDate() + 7);
    return { from: start, to };
  }
  if (period === "this_month") {
    const to = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { from: start, to };
  }
  if (period === "three_months") {
    const to = new Date(start);
    to.setMonth(to.getMonth() + 3);
    return { from: start, to };
  }
  return {};
}

const VALID_CATEGORIES: CompetitionCategory[] = [
  "domestic_major",
  "domestic_general",
  "intl_korea_round",
  "abroad_admission",
  "regional",
];

export default async function CompetitionsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawCategory = searchParams.category;
  const category = VALID_CATEGORIES.includes(rawCategory as CompetitionCategory)
    ? (rawCategory as CompetitionCategory)
    : undefined;
  const { from, to } = periodToRange(searchParams.period);

  const items = await listPublishedCompetitions({
    category,
    periodFrom: from,
    periodTo: to,
    search: searchParams.search?.trim() || undefined,
    limit: 60,
  });

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink">
            발레 콩쿠르
          </h1>
          <p className="mt-2 text-sm text-warm-gray">
            국내·국제 콩쿠르를 한 화면에서 비교해 보세요
          </p>
        </header>

        <FilterBar />

        <div className="mt-6 flex items-baseline justify-between">
          <div className="text-sm text-warm-gray">총 {items.length}건</div>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 border border-dashed border-border rounded-md bg-white py-16 text-center">
            <div className="text-sm text-warm-gray">
              조건에 맞는 대회가 없어요
            </div>
            <Link
              href="/competitions"
              className="mt-3 inline-block text-xs text-brand hover:underline"
            >
              필터 초기화 →
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {items.map((c) => (
              <CompetitionCard key={c.id} competition={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
