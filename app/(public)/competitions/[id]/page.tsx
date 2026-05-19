import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Flag } from "lucide-react";
import {
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  type Competition,
} from "@/lib/types/competition";
import { DDayBadge } from "@/components/public/DDayBadge";
import { CopyLinkButton } from "@/components/public/CopyLinkButton";
import { formatDate, formatDateRange, toDate } from "@/lib/format";
import { getCompetitionById } from "@/lib/firebase/queries";

export const revalidate = 300;

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const c = await getCompetitionById(params.id);
  if (!c) return { title: "대회를 찾을 수 없어요 — K BALLET & CO." };
  const desc = `${c.host} 주최. ${formatDateRange(c.dateStart, c.dateEnd)} · ${c.venue}`;
  return {
    title: `${c.name} — K BALLET & CO.`,
    description: desc,
    openGraph: {
      title: c.name,
      description: desc,
      images: c.posterUrl ? [c.posterUrl] : undefined,
    },
  };
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const c = await getCompetitionById(params.id);
  if (!c) notFound();

  const regEnd = toDate(c.registrationEnd);
  const lastVerified = toDate(c.lastVerifiedAt);
  const reportSubject = `[K BALLET] ${c.name} 정보 신고`;
  const reportBody = `대회 ID: ${c.id}\n페이지: /competitions/${c.id}\n\n[수정/신고 내용을 적어주세요]`;
  const mailto = `mailto:uedutainment@gmail.com?subject=${encodeURIComponent(
    reportSubject,
  )}&body=${encodeURIComponent(reportBody)}`;

  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <nav className="text-xs text-warm-gray mb-4">
          <Link href="/competitions" className="hover:text-ink">
            발레 콩쿠르
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{c.name}</span>
        </nav>

        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray mb-3">
              {CATEGORY_LABELS[c.category]}
              {c.edition ? <span className="ml-2">· {c.edition}</span> : null}
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-tight">
              {c.name}
            </h1>
            <div className="mt-2 text-sm text-warm-gray">{c.host} 주최</div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            {regEnd ? <DDayBadge date={regEnd} /> : null}
            <CopyLinkButton
              url={`https://ballet-kappa.vercel.app/competitions/${c.id}`}
            />
            <a
              href={mailto}
              className="inline-flex items-center gap-1 text-xs text-warm-gray hover:text-ink transition-colors"
              aria-label="정보 신고"
            >
              <Flag className="size-3.5" />
              신고
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          <Poster competition={c} />
          <InfoGrid competition={c} />
        </div>

        <CTASection competition={c} />

        <footer className="mt-12 pt-6 border-t border-border text-[11px] text-warm-gray space-y-1">
          <div>
            공식 자료 기반 · 마지막 확인{" "}
            {lastVerified ? formatDate(lastVerified) : "—"}
          </div>
          <div>최종 내용은 반드시 공식 요강을 확인해 주세요.</div>
        </footer>
      </div>

      <Script
        id="jsonld-event"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildEventJsonLd(c)),
        }}
      />
    </article>
  );
}

function Poster({ competition: c }: { competition: Competition }) {
  const [gFrom, gTo] = CATEGORY_GRADIENTS[c.category];
  return (
    <div className="relative rounded-md border border-border overflow-hidden bg-white aspect-[3/4]">
      {c.posterUrl ? (
        <Image
          src={c.posterUrl}
          alt={`${c.name} 포스터`}
          fill
          sizes="(max-width: 768px) 100vw, 260px"
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center font-serif text-white text-sm"
          style={{
            background: `linear-gradient(135deg, ${gFrom} 0%, ${gTo} 100%)`,
          }}
        >
          {CATEGORY_LABELS[c.category]}
        </div>
      )}
    </div>
  );
}

function InfoGrid({ competition: c }: { competition: Competition }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["주최", c.host],
    ["일정", formatDateRange(c.dateStart, c.dateEnd) || "—"],
    [
      "접수",
      c.registrationStart || c.registrationEnd
        ? formatDateRange(c.registrationStart, c.registrationEnd)
        : "—",
    ],
    ["장소", c.venue],
    ["부문", c.sections.length > 0 ? c.sections.join(" · ") : "—"],
    ["연령", c.ageGroups.length > 0 ? c.ageGroups.join(" · ") : "—"],
    ["참가비", c.fee ?? "—"],
    ["시상", c.awards ?? "—"],
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

function CTASection({ competition: c }: { competition: Competition }) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      <a
        href={c.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center bg-brand text-white hover:bg-brand-dark transition-colors rounded-sm px-5 py-3 text-sm font-medium"
      >
        공식 요강 보기 →
      </a>
      {c.registerUrl ? (
        <a
          href={c.registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center border border-border text-ink hover:bg-cream-start transition-colors rounded-sm px-5 py-3 text-sm"
        >
          접수하러 가기 →
        </a>
      ) : null}
    </div>
  );
}

function buildEventJsonLd(c: Competition) {
  const dateStart = toDate(c.dateStart);
  const dateEnd = toDate(c.dateEnd);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: c.name,
    description: `${c.host} · ${c.venue}`,
    startDate: dateStart?.toISOString(),
    endDate: dateEnd?.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: c.venue,
    },
    organizer: {
      "@type": "Organization",
      name: c.host,
      url: c.officialUrl,
    },
    image: c.posterUrl ? [c.posterUrl] : undefined,
    url: c.officialUrl,
  };
}
