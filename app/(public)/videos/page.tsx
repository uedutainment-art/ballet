import Link from "next/link";
import { VideoCard } from "@/components/public/VideoCard";
import { listPublishedVideos } from "@/lib/firebase/queries";
import {
  SERIES_LABELS,
  type VideoLevel,
  type VideoSeries,
} from "@/lib/types/video";
import { cn } from "@/lib/cn";

export const revalidate = 300;

type SearchParams = { level?: string; series?: string };

const LEVEL_TABS: Array<{ key: VideoLevel | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "L0", label: "L0" },
  { key: "L1", label: "L1" },
  { key: "L2", label: "L2" },
  { key: "L3", label: "L3" },
  { key: "L4", label: "L4" },
];

function normalizeLevel(v?: string): VideoLevel | undefined {
  if (
    v === "L0" ||
    v === "L0.5" ||
    v === "L1" ||
    v === "L2" ||
    v === "L3" ||
    v === "L4"
  ) {
    return v;
  }
  return undefined;
}

function normalizeSeries(v?: string): VideoSeries | undefined {
  if (
    v === "levels" ||
    v === "admission" ||
    v === "competition" ||
    v === "interview" ||
    v === "review" ||
    v === "other"
  ) {
    return v;
  }
  return undefined;
}

export default async function VideosListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const level = normalizeLevel(searchParams.level);
  const series = normalizeSeries(searchParams.series);
  const items = await listPublishedVideos({ level, series, limit: 100 });
  const activeLevel: VideoLevel | "all" = level ?? "all";

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 bg-cream-start/60 border border-border rounded-md p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-warm-gray uppercase mb-1">
              K BALLET TV
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink">
              발레 영상
            </h1>
            <p className="mt-2 text-sm text-warm-gray">
              레벨별 가이드 · 입시 · 콩쿠르 · 인터뷰 영상을 큐레이션해 드려요
            </p>
          </div>
          <Link
            href="https://www.youtube.com/@kballetco"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-ink text-white hover:bg-brand-dark transition-colors rounded-sm px-4 py-2 text-sm"
          >
            채널 구독 →
          </Link>
        </header>

        <nav className="flex gap-1 border-b border-border overflow-x-auto -mx-2 px-2">
          {LEVEL_TABS.map((t) => {
            const active = activeLevel === t.key;
            const params = new URLSearchParams();
            if (t.key !== "all") params.set("level", t.key);
            if (series) params.set("series", series);
            const qs = params.toString();
            return (
              <Link
                key={t.key}
                href={qs ? `/videos?${qs}` : "/videos"}
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

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-warm-gray">시리즈</span>
          <SeriesFilter active={series} level={level} />
          <span className="ml-auto text-sm text-warm-gray">
            총 {items.length}편
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 border border-dashed border-border rounded-md bg-white py-16 text-center">
            <div className="text-sm text-warm-gray">
              {level || series ?
                "필터 조건에 맞는 영상이 없어요" :
                "공개된 영상이 없어요"}
            </div>
            {(level || series) ? (
              <Link
                href="/videos"
                className="mt-3 inline-block text-xs text-brand hover:underline"
              >
                전체 보기 →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SeriesFilter({
  active,
  level,
}: {
  active: VideoSeries | undefined;
  level: VideoLevel | undefined;
}) {
  const options: Array<{ key: VideoSeries | "all"; label: string }> = [
    { key: "all", label: "전체" },
    ...(Object.keys(SERIES_LABELS) as VideoSeries[]).map((k) => ({
      key: k,
      label: SERIES_LABELS[k],
    })),
  ];
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => {
        const isActive = (active ?? "all") === o.key;
        const params = new URLSearchParams();
        if (o.key !== "all") params.set("series", o.key);
        if (level) params.set("level", level);
        const qs = params.toString();
        return (
          <Link
            key={o.key}
            href={qs ? `/videos?${qs}` : "/videos"}
            className={cn(
              "text-[11px] px-2 py-1 rounded-sm border transition-colors",
              isActive ?
                "border-brand bg-brand/10 text-ink" :
                "border-border text-warm-gray hover:text-ink hover:bg-cream-start/40",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
