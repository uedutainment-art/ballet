import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { CompetitionCard } from "@/components/public/CompetitionCard";
import { AdmissionCard } from "@/components/public/AdmissionCard";
import { PerformanceCard } from "@/components/public/PerformanceCard";
import { VideoCard } from "@/components/public/VideoCard";
import {
  getOrganizationById,
  listAdmissionsBySchoolOrg,
  listCompetitionsByHostOrg,
  listPerformancesByOrg,
  listVideosByRelatedOrg,
} from "@/lib/firebase/queries";
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
} from "@/lib/types/organization";

export const revalidate = 600;

type Params = { params: { id: string } };
type SearchParams = { searchParams: { tab?: string } };

export async function generateMetadata({ params }: Params) {
  const org = await getOrganizationById(params.id);
  if (!org || org.workflowState !== "PUBLISHED") return { title: "찾을 수 없음" };
  return {
    title: `${org.name} · K BALLET`,
    description:
      org.description ??
      `${org.name} — ${ORG_TYPE_LABELS[org.type]}${org.region ? ` · ${org.region}` : ""}`,
  };
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: Params & SearchParams) {
  const org = await getOrganizationById(params.id);
  if (!org || org.workflowState !== "PUBLISHED" || org.status !== "ACTIVE") {
    notFound();
  }

  // Fetch all related content in parallel; render tab counts from the lengths.
  const [comps, adms, perfs, vids] = await Promise.all([
    listCompetitionsByHostOrg(org.id),
    listAdmissionsBySchoolOrg(org.id),
    listPerformancesByOrg(org.id),
    listVideosByRelatedOrg(org.id),
  ]);

  const tabs = [
    { key: "competitions", label: "콩쿠르", count: comps.length },
    { key: "admissions", label: "입시", count: adms.length },
    { key: "performances", label: "공연", count: perfs.length },
    { key: "videos", label: "영상", count: vids.length },
  ];
  // Default to the first tab that has content.
  const defaultTab =
    tabs.find((t) => t.count > 0)?.key ?? "competitions";
  const activeTab = searchParams.tab ?? defaultTab;

  const initial = (org.shortName || org.name).trim().charAt(0) || "?";
  const accent = ORG_TYPE_COLORS[org.type];

  return (
    <>
      {/* Header card */}
      <section className="bg-cream py-12 px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/organizations"
            className="inline-block text-xs text-warm-gray hover:text-ink mb-4"
          >
            ← 기관 디렉터리
          </Link>

          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative w-20 h-20 rounded-md overflow-hidden border border-border bg-white shrink-0">
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt={`${org.name} 로고`}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-white text-2xl font-medium"
                  style={{ backgroundColor: accent }}
                >
                  {initial}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-serif text-ink leading-tight">
                {org.name}
              </h1>
              {org.englishName ? (
                <div className="text-sm text-warm-gray mt-1">{org.englishName}</div>
              ) : null}
              <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-warm-gray">
                <span className="inline-block px-2 py-0.5 rounded-sm border border-border">
                  {ORG_TYPE_LABELS[org.type]}
                </span>
                {org.region ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {org.region}
                  </span>
                ) : null}
                {org.establishedYear ? (
                  <span>설립 {org.establishedYear}</span>
                ) : null}
              </div>

              {org.description ? (
                <p className="mt-3 text-sm text-ink/80 leading-relaxed">
                  {org.description}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-4 flex-wrap text-xs">
                {org.websiteUrl ? (
                  <a
                    href={org.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline"
                  >
                    <Globe className="size-3.5" />
                    공식 사이트
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
                {org.email ? (
                  <a
                    href={`mailto:${org.email}`}
                    className="inline-flex items-center gap-1 text-warm-gray hover:text-ink"
                  >
                    <Mail className="size-3.5" />
                    {org.email}
                  </a>
                ) : null}
                {org.phone ? (
                  <span className="inline-flex items-center gap-1 text-warm-gray">
                    <Phone className="size-3.5" />
                    {org.phone}
                  </span>
                ) : null}
                {org.socialLinks?.instagram ? (
                  <a
                    href={org.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-warm-gray hover:text-ink"
                  >
                    Instagram <ExternalLink className="size-3" />
                  </a>
                ) : null}
                {org.socialLinks?.youtube ? (
                  <a
                    href={org.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-warm-gray hover:text-ink"
                  >
                    YouTube <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <Link
                  key={t.key}
                  href={`/organizations/${org.id}?tab=${t.key}`}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    active
                      ? "border-brand text-ink"
                      : "border-transparent text-warm-gray hover:text-ink"
                  }`}
                >
                  {t.label}{" "}
                  <span className="ml-1 text-[11px] text-warm-gray">
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            {activeTab === "competitions" ? (
              <Grid
                empty="이 기관이 주관하는 공개된 콩쿠르가 없어요"
                cols={3}
              >
                {comps.map((c) => (
                  <CompetitionCard key={c.id} competition={c} />
                ))}
              </Grid>
            ) : activeTab === "admissions" ? (
              <Grid
                empty="이 학교의 공개된 입시 정보가 없어요"
                cols={3}
                items={adms.length}
              >
                {adms.map((a) => (
                  <AdmissionCard key={a.id} admission={a} />
                ))}
              </Grid>
            ) : activeTab === "performances" ? (
              <Grid
                empty="이 기관과 연결된 공개된 공연이 없어요"
                cols={3}
                items={perfs.length}
              >
                {perfs.map((p) => (
                  <PerformanceCard key={p.id} performance={p} />
                ))}
              </Grid>
            ) : (
              <Grid
                empty="이 기관과 연결된 영상이 없어요"
                cols={3}
                items={vids.length}
              >
                {vids.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </Grid>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Grid({
  children,
  empty,
  cols = 3,
  items,
}: {
  children: React.ReactNode;
  empty: string;
  cols?: 2 | 3;
  items?: number;
}) {
  const count = items ?? (Array.isArray(children) ? children.length : 0);
  if (count === 0) {
    return (
      <div className="border border-dashed border-border rounded-md bg-white py-16 text-center text-sm text-warm-gray">
        {empty}
      </div>
    );
  }
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        cols === 3 ? "lg:grid-cols-3" : ""
      } gap-4`}
    >
      {children}
    </div>
  );
}
