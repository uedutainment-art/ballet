import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import {
  CSAT_LABELS,
  SCHOOL_TYPE_COLORS,
  SCHOOL_TYPE_LABELS,
  type Admission,
} from "@/lib/types/admission";
import { DDayBadge } from "@/components/public/DDayBadge";
import { CopyLinkButton } from "@/components/public/CopyLinkButton";
import { formatDate, formatDateRange, toDate } from "@/lib/format";
import { getAdmissionById } from "@/lib/firebase/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const a = await getAdmissionById(params.id);
  if (!a) return { title: "입시 정보를 찾을 수 없어요" };
  const desc = `${a.schoolName} ${a.department} · ${a.year}학년도 모집 — ${
    a.regStart ? formatDate(a.regStart) : "—"
  } 부터 원서 접수`;
  return {
    title: `${a.schoolName} ${a.department} ${a.year}학년도 입시`,
    description: desc,
    openGraph: { title: a.schoolName, description: desc },
  };
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const a = await getAdmissionById(params.id);
  if (!a) notFound();

  const regEnd = toDate(a.regEnd);
  const lastVerified = toDate(a.lastVerifiedAt);
  const color = SCHOOL_TYPE_COLORS[a.schoolType];

  const reportSubject = `[K BALLET] ${a.schoolName} ${a.department} 입시 정보 신고`;
  const reportBody = `입시 ID: ${a.id}\n페이지: /admissions/${a.id}\n\n[수정/신고 내용을 적어주세요]`;
  const mailto = `mailto:uedutainment@gmail.com?subject=${encodeURIComponent(
    reportSubject,
  )}&body=${encodeURIComponent(reportBody)}`;

  return (
    <article className="px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <nav className="text-xs text-warm-gray mb-4">
          <Link href="/admissions" className="hover:text-ink">
            발레 입시
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">
            {a.schoolName} {a.department}
          </span>
        </nav>

        <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div
              className="size-20 rounded-full flex items-center justify-center font-serif text-white text-xl shrink-0"
              style={{ background: color }}
              aria-hidden
            >
              {a.schoolName.replace(/\s+/g, "").slice(0, 2)}
            </div>
            <div>
              <div className="inline-flex items-center text-[10px] px-2 py-[3px] rounded-sm bg-cream-start text-warm-gray mb-2">
                {SCHOOL_TYPE_LABELS[a.schoolType]} · {a.year}학년도
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink leading-tight">
                {a.schoolName}
              </h1>
              <div className="mt-1 text-sm text-warm-gray">{a.department}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            {regEnd ? <DDayBadge date={regEnd} /> : null}
            <CopyLinkButton url={`${SITE_URL}/admissions/${a.id}`} />
            <a
              href={mailto}
              className="text-xs text-warm-gray hover:text-ink transition-colors"
            >
              신고
            </a>
          </div>
        </header>

        <InfoGrid admission={a} />

        <CTASection admission={a} />

        <footer className="mt-12 pt-6 border-t border-border text-[11px] text-warm-gray space-y-1">
          <div>
            공식 자료 기반 · 마지막 확인{" "}
            {lastVerified ? formatDate(lastVerified) : "—"}
          </div>
          <div>최종 내용은 반드시 공식 모집요강을 확인해 주세요.</div>
        </footer>
      </div>

      <Script
        id="jsonld-admission"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildAdmissionJsonLd(a)),
        }}
      />
    </article>
  );
}

function InfoGrid({ admission: a }: { admission: Admission }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["학교 유형", `${SCHOOL_TYPE_LABELS[a.schoolType]} · ${a.year}학년도`],
    ["모집인원", a.capacity ? `${a.capacity}명` : "—"],
    ["원서 접수", formatDateRange(a.regStart, a.regEnd) || "—"],
    [
      "실기",
      [a.practical1, a.practical2]
        .map((t) => (t ? formatDate(t) : null))
        .filter(Boolean)
        .join(" · ") || "—",
    ],
    ["발표", a.announcementAt ? formatDate(a.announcementAt) : "—"],
    ["실기과목", a.subjects.length > 0 ? a.subjects.join(" · ") : "—"],
    ["수능 반영", CSAT_LABELS[a.csat]],
    ["전형료", a.fee ?? "—"],
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

function CTASection({ admission: a }: { admission: Admission }) {
  if (!a.officialUrl && !a.guidelineUrl) return null;
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      {a.officialUrl ? (
        <a
          href={a.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-brand text-white hover:bg-brand-dark transition-colors rounded-sm px-5 py-3 text-sm font-medium"
        >
          공식 사이트 →
        </a>
      ) : null}
      {a.guidelineUrl ? (
        <a
          href={a.guidelineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center border border-border text-ink hover:bg-cream-start transition-colors rounded-sm px-5 py-3 text-sm"
        >
          모집요강 PDF →
        </a>
      ) : null}
    </div>
  );
}

function buildAdmissionJsonLd(a: Admission) {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: `${a.schoolName} ${a.department}`,
    description: `${SCHOOL_TYPE_LABELS[a.schoolType]} · ${a.year}학년도 입시`,
    provider: {
      "@type": "EducationalOrganization",
      name: a.schoolName,
      url: a.officialUrl,
    },
    applicationStartDate: toDate(a.regStart)?.toISOString(),
    applicationDeadline: toDate(a.regEnd)?.toISOString(),
    url: a.officialUrl,
  };
}
