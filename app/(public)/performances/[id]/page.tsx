import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Flag } from "lucide-react";
import {
  COMPANY_TYPE_LABELS,
  type Performance,
} from "@/lib/types/performance";
import { PosterPlaceholder } from "@/components/posters/PosterPlaceholder";
import { CopyLinkButton } from "@/components/public/CopyLinkButton";
import { formatDateRange, toDate } from "@/lib/format";
import { getPerformanceById } from "@/lib/firebase/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const p = await getPerformanceById(params.id);
  if (!p) return { title: "공연을 찾을 수 없어요" };
  const desc = `${p.company} · ${formatDateRange(p.dateStart, p.dateEnd)} · ${p.venue}`;
  return {
    title: p.title,
    description: desc,
    openGraph: {
      title: p.title,
      description: desc,
      images: p.posterUrl ? [p.posterUrl] : undefined,
    },
  };
}

export default async function PerformanceDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const p = await getPerformanceById(params.id);
  if (!p) notFound();

  const lastVerified = toDate(p.lastVerifiedAt);
  const reportSubject = `[K BALLET] ${p.title} 공연 정보 신고`;
  const reportBody = `공연 ID: ${p.id}\n페이지: /performances/${p.id}\n\n[수정/신고 내용을 적어주세요]`;
  const mailto = `mailto:uedutainment@gmail.com?subject=${encodeURIComponent(
    reportSubject,
  )}&body=${encodeURIComponent(reportBody)}`;

  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <nav className="text-xs text-warm-gray mb-4">
          <Link href="/performances" className="hover:text-ink">
            발레 공연
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{p.title}</span>
        </nav>

        <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            {p.companyType ? (
              <div className="inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray mb-3">
                {COMPANY_TYPE_LABELS[p.companyType]}
              </div>
            ) : null}
            <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-tight">
              {p.title}
            </h1>
            <div className="mt-2 text-sm text-warm-gray">{p.company}</div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <CopyLinkButton url={`${SITE_URL}/performances/${p.id}`} />
            <a
              href={mailto}
              className="inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink transition-colors"
            >
              <Flag className="size-3.5" />
              신고
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:gap-12">
          <Poster performance={p} />
          <InfoGrid performance={p} />
        </div>

        <CTASection performance={p} />

        {p.description ? (
          <section className="mt-8 bg-cream-start/30 rounded-md p-4 border border-border text-sm leading-relaxed text-ink">
            {p.description}
          </section>
        ) : null}

        <footer className="mt-12 pt-6 border-t border-border text-[11px] text-warm-gray space-y-1">
          <div>
            공식 자료 기반 · 마지막 확인{" "}
            {lastVerified ? formatDateRange(lastVerified, lastVerified) : "—"}
          </div>
          <div>티켓 예매 정보는 변동될 수 있으니 공식 사이트도 확인해 주세요.</div>
        </footer>
      </div>

      <Script
        id="jsonld-performance"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildEventJsonLd(p)),
        }}
      />
    </article>
  );
}

function Poster({ performance: p }: { performance: Performance }) {
  return (
    <div className="relative rounded-md border border-border overflow-hidden bg-white aspect-[2/3] max-w-sm mx-auto lg:mx-0 lg:max-w-none w-full">
      {p.posterUrl ? (
        <Image
          src={p.posterUrl}
          alt={`${p.title} 포스터`}
          fill
          sizes="(max-width: 1024px) 100vw, 300px"
          className="object-cover"
          priority
        />
      ) : (
        <PosterPlaceholder
          title={p.title}
          dateLabel={p.company}
          placeholderId={p.id}
        />
      )}
    </div>
  );
}

function InfoGrid({ performance: p }: { performance: Performance }) {
  const priceLabel = (() => {
    if (p.ticketPriceMin && p.ticketPriceMax) {
      if (p.ticketPriceMin === p.ticketPriceMax) {
        return `₩${p.ticketPriceMin.toLocaleString()}`;
      }
      return `₩${p.ticketPriceMin.toLocaleString()} – ₩${p.ticketPriceMax.toLocaleString()}`;
    }
    if (p.ticketPriceMin) return `₩${p.ticketPriceMin.toLocaleString()}부터`;
    return "—";
  })();

  const rows: Array<[string, React.ReactNode]> = [
    ["단체", p.company],
    ["일정", formatDateRange(p.dateStart, p.dateEnd) || "—"],
    ["회차", p.showtimes.length > 0 ? p.showtimes.join(" · ") : "—"],
    ["장소", p.venue],
    ["티켓", priceLabel],
    ["안무", p.choreographer ?? "—"],
    ["음악", p.composer ?? "—"],
    ["러닝타임", p.runtime ? `약 ${p.runtime}분` : "—"],
    ["관람연령", p.ageLimit ?? "—"],
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
      {rows.map(([label, value]) => (
        <div key={label} className="border-b border-border pb-3">
          <dt className="text-[11px] tracking-wider text-warm-gray uppercase">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CTASection({ performance: p }: { performance: Performance }) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      {p.ticketUrl ? (
        <a
          href={p.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-brand text-white hover:bg-brand-dark transition-colors rounded-sm px-5 py-3 text-sm font-medium"
        >
          예매하기 →
        </a>
      ) : null}
      {p.officialUrl ? (
        <a
          href={p.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center border border-border text-ink hover:bg-cream-start transition-colors rounded-sm px-5 py-3 text-sm"
        >
          공식 페이지 →
        </a>
      ) : null}
    </div>
  );
}

function buildEventJsonLd(p: Performance) {
  const dateStart = toDate(p.dateStart);
  const dateEnd = toDate(p.dateEnd);
  return {
    "@context": "https://schema.org",
    "@type": "TheaterEvent",
    name: p.title,
    description: p.description || `${p.company} · ${p.venue}`,
    startDate: dateStart?.toISOString(),
    endDate: dateEnd?.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: p.venue },
    performer: { "@type": "PerformingGroup", name: p.company },
    image: p.posterUrl ? [p.posterUrl] : undefined,
    offers: p.ticketUrl ?
      {
        "@type": "Offer",
        url: p.ticketUrl,
        priceCurrency: "KRW",
        ...(p.ticketPriceMin ? { price: p.ticketPriceMin } : {}),
      } :
      undefined,
    url: p.officialUrl,
  };
}
