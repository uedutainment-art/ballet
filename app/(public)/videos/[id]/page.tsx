import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Flag } from "lucide-react";
import {
  LEVEL_LABELS,
  SERIES_LABELS,
  TYPE_LABELS,
  type Video,
} from "@/lib/types/video";
import {
  formatDuration,
  getEmbedUrl,
  getThumbnailUrl,
} from "@/lib/utils/youtube";
import { CopyLinkButton } from "@/components/public/CopyLinkButton";
import { VideoCard } from "@/components/public/VideoCard";
import {
  getAdmissionById,
  getCompetitionById,
  getPerformanceById,
  getVideoById,
  listVideosBySeries,
} from "@/lib/firebase/queries";
import { toDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const v = await getVideoById(params.id);
  if (!v) return { title: "영상을 찾을 수 없어요" };
  return {
    title: v.title,
    description: v.description ?? `${SERIES_LABELS[v.series]} 영상`,
    openGraph: {
      title: v.title,
      description: v.description ?? undefined,
      images: [v.thumbnailUrl || getThumbnailUrl(v.youtubeId)],
      videos: [{ url: getEmbedUrl(v.youtubeId) }],
    },
  };
}

export default async function VideoDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const v = await getVideoById(params.id);
  if (!v) notFound();

  // Resolve related items in parallel — small N, no need to batch.
  const [relatedCompetitions, relatedAdmissions, relatedPerformances, sameSeries] =
    await Promise.all([
      Promise.all(
        (v.relatedCompetitionIds ?? []).map((id) => getCompetitionById(id)),
      ),
      Promise.all(
        (v.relatedAdmissionIds ?? []).map((id) => getAdmissionById(id)),
      ),
      Promise.all(
        (v.relatedPerformanceIds ?? []).map((id) => getPerformanceById(id)),
      ),
      listVideosBySeries(v.series, 5),
    ]);
  const nextInSeries = sameSeries.filter((x) => x.id !== v.id).slice(0, 3);

  const reportSubject = `[K BALLET] ${v.title} 영상 정보 신고`;
  const reportBody = `영상 ID: ${v.id}\nYouTube: ${v.youtubeUrl}\n페이지: /videos/${v.id}\n\n[수정/신고 내용을 적어주세요]`;
  const mailto = `mailto:uedutainment@gmail.com?subject=${encodeURIComponent(
    reportSubject,
  )}&body=${encodeURIComponent(reportBody)}`;

  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <nav className="text-xs text-warm-gray mb-4">
          <Link href="/videos" className="hover:text-ink">
            발레 영상
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{v.title}</span>
        </nav>

        {/* Responsive YouTube embed. Shorts use 9:16 in a narrow centered
            column so the player matches the source format and doesn't get
            stretched into a giant landscape rectangle. */}
        <div
          className={
            v.type === "short"
              ? "relative w-full max-w-[360px] mx-auto aspect-[9/16] bg-black rounded-md overflow-hidden border border-border"
              : "relative w-full aspect-video bg-black rounded-md overflow-hidden border border-border"
          }
        >
          <iframe
            src={getEmbedUrl(v.youtubeId)}
            title={v.title}
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <header className="mt-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2">
              <span className="inline-flex items-center px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray">
                {SERIES_LABELS[v.series]}
              </span>
              {v.level ? (
                <span className="inline-flex items-center px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray">
                  {LEVEL_LABELS[v.level]}
                </span>
              ) : null}
              <span className="text-warm-gray">{TYPE_LABELS[v.type]}</span>
              {v.durationSeconds ? (
                <span className="text-warm-gray font-mono">
                  · {formatDuration(v.durationSeconds)}
                </span>
              ) : null}
              {v.host ? <span className="text-warm-gray">· {v.host}</span> : null}
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-medium text-ink leading-snug">
              {v.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <CopyLinkButton url={`${SITE_URL}/videos/${v.id}`} />
            <a
              href={mailto}
              className="inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink transition-colors"
            >
              <Flag className="size-3.5" />
              신고
            </a>
          </div>
        </header>

        {v.description ? (
          <section className="mt-6 text-sm text-ink leading-relaxed whitespace-pre-wrap">
            {v.description}
          </section>
        ) : null}

        <RelatedSection
          competitions={relatedCompetitions.filter((x) => x !== null)}
          admissions={relatedAdmissions.filter((x) => x !== null)}
          performances={relatedPerformances.filter((x) => x !== null)}
        />

        {nextInSeries.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-sm font-medium text-ink mb-3">
              같은 시리즈에서
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nextInSeries.map((x) => (
                <VideoCard key={x.id} video={x} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Script
        id="jsonld-video"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildVideoJsonLd(v)),
        }}
      />
    </article>
  );
}

function RelatedSection({
  competitions,
  admissions,
  performances,
}: {
  competitions: NonNullable<Awaited<ReturnType<typeof getCompetitionById>>>[];
  admissions: NonNullable<Awaited<ReturnType<typeof getAdmissionById>>>[];
  performances: NonNullable<Awaited<ReturnType<typeof getPerformanceById>>>[];
}) {
  if (
    competitions.length === 0 &&
    admissions.length === 0 &&
    performances.length === 0
  ) {
    return null;
  }
  return (
    <section className="mt-8 bg-cream-start/30 border border-border rounded-md p-4 space-y-3">
      <div className="text-xs text-warm-gray uppercase tracking-wider">
        함께 보기
      </div>
      {competitions.length > 0 ? (
        <RelatedList
          label="콩쿠르"
          items={competitions.map((c) => ({
            href: `/competitions/${c.id}`,
            title: c.name,
          }))}
        />
      ) : null}
      {admissions.length > 0 ? (
        <RelatedList
          label="입시"
          items={admissions.map((a) => ({
            href: `/admissions/${a.id}`,
            title: `${a.schoolName} · ${a.department}`,
          }))}
        />
      ) : null}
      {performances.length > 0 ? (
        <RelatedList
          label="공연"
          items={performances.map((p) => ({
            href: `/performances/${p.id}`,
            title: `${p.title} · ${p.company}`,
          }))}
        />
      ) : null}
    </section>
  );
}

function RelatedList({
  label,
  items,
}: {
  label: string;
  items: Array<{ href: string; title: string }>;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] tracking-wider text-warm-gray uppercase shrink-0 w-12 mt-0.5">
        {label}
      </span>
      <ul className="flex-1 space-y-1">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="text-sm text-ink hover:underline"
            >
              {it.title} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildVideoJsonLd(v: Video) {
  const uploadDate = toDate(v.publishedAt) ?? toDate(v.aiCollectedAt);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description ?? `${SERIES_LABELS[v.series]} 영상`,
    thumbnailUrl: v.thumbnailUrl || getThumbnailUrl(v.youtubeId),
    uploadDate: uploadDate?.toISOString(),
    embedUrl: getEmbedUrl(v.youtubeId),
    contentUrl: v.youtubeUrl,
  };
}
