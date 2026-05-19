import Link from "next/link";
import { Search } from "lucide-react";
import { CompetitionCard } from "@/components/public/CompetitionCard";
import { listUrgentCompetitions } from "@/lib/firebase/queries";

// Revalidate every 5 minutes. Editor publishes new competitions and the page
// catches up on the next request after this window without a full rebuild.
export const revalidate = 300;

export default async function Home() {
  const urgent = await listUrgentCompetitions(4);

  return (
    <>
      <section className="bg-cream py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-4">
            K BALLET &amp; CO.
          </div>
          <h1 className="m-0 text-3xl md:text-4xl font-serif font-medium text-ink leading-[1.35]">
            발레의 모든 정보,
          </h1>
          <h1 className="m-0 text-3xl md:text-4xl font-serif font-medium italic text-gold leading-[1.35]">
            한 곳에서.
          </h1>
          <p className="mt-4 text-sm text-warm-gray">
            콩쿠르 · 입시 · 공연 정보를 매주 새로 정리해 드립니다
          </p>

          <form
            action="/competitions"
            method="get"
            className="mt-8 mx-auto max-w-md flex items-center gap-2 bg-white border border-border rounded-md px-3 h-11 focus-within:ring-2 focus-within:ring-brand/30"
          >
            <Search className="size-4 text-warm-gray" aria-hidden />
            <input
              type="search"
              name="search"
              placeholder="대회명 · 학교 · 장소로 검색"
              className="flex-1 bg-transparent border-0 outline-none text-sm text-ink placeholder:text-warm-gray/60"
              aria-label="검색"
            />
          </form>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-xl font-serif font-medium text-ink">
                마감 임박 대회
                <span className="ml-2 text-sm text-warm-gray font-sans font-normal">
                  {urgent.length}건
                </span>
              </h2>
              <p className="mt-1 text-xs text-warm-gray">
                접수 마감이 가장 가까운 대회부터 보여드려요
              </p>
            </div>
            <Link
              href="/competitions"
              className="text-sm text-brand hover:underline"
            >
              전체 보기 →
            </Link>
          </div>

          {urgent.length === 0 ? (
            <div className="border border-dashed border-border rounded-md bg-white py-16 text-center">
              <div className="text-sm text-warm-gray">
                이번 주는 마감 임박 대회가 없어요
              </div>
              <Link
                href="/competitions"
                className="mt-3 inline-block text-xs text-brand hover:underline"
              >
                전체 대회 보기 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {urgent.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlaceholderTile title="입시 정보" tagline="예고 · 대학 · 콩쿠르 일정을 모아 정리 중이에요" />
          <PlaceholderTile title="강의 영상" tagline="베리에이션 · 솔로 영상 큐레이션이 곧 열려요" />
        </div>
      </section>
    </>
  );
}

function PlaceholderTile({
  title,
  tagline,
}: {
  title: string;
  tagline: string;
}) {
  return (
    <div className="border border-dashed border-border rounded-md bg-cream-start/40 p-8">
      <div className="text-sm font-serif font-medium text-ink">{title}</div>
      <p className="mt-2 text-xs text-warm-gray">{tagline}</p>
      <div className="mt-4 inline-block text-[11px] tracking-wider text-warm-gray/70 uppercase">
        coming soon
      </div>
    </div>
  );
}
