import Link from "next/link";
import { OrgCard } from "@/components/public/OrgCard";
import { listPublishedOrganizations } from "@/lib/firebase/queries";
import {
  ORG_TYPE_LABELS,
  ORG_TYPE_ORDER,
  type OrgType,
} from "@/lib/types/organization";
import { cn } from "@/lib/cn";

export const revalidate = 600;

type SearchParams = { type?: string; region?: string };

function normalizeType(v?: string): OrgType | undefined {
  if (!v) return undefined;
  return ORG_TYPE_ORDER.includes(v as OrgType) ? (v as OrgType) : undefined;
}

export default async function OrganizationsDirectory({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const type = normalizeType(searchParams.type);
  const region = searchParams.region?.trim() || undefined;

  const orgs = await listPublishedOrganizations({
    limit: 500,
    type,
    region,
  });

  // Build region facet from the loaded result so it reflects what's actually
  // visible (no need to keep a master list in code).
  const regionCounts = new Map<string, number>();
  for (const o of orgs) {
    if (!o.region) continue;
    regionCounts.set(o.region, (regionCounts.get(o.region) ?? 0) + 1);
  }
  const regions = Array.from(regionCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "ko"),
  );

  return (
    <>
      <section className="bg-cream py-16 px-6">
        <div className="mx-auto max-w-7xl text-center">
          <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-4">
            ORGANIZATIONS
          </div>
          <h1 className="m-0 text-3xl md:text-4xl font-serif font-medium text-ink leading-[1.35]">
            발레 기관 디렉터리
          </h1>
          <p className="mt-4 text-sm text-warm-gray">
            대학·예고·예중·발레단·협회·공연장을 한곳에서 찾아볼 수 있어요
          </p>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar filters */}
          <aside className="space-y-6">
            <div>
              <div className="text-xs tracking-wider text-warm-gray uppercase mb-2">
                유형
              </div>
              <ul className="space-y-1 text-sm">
                <li>
                  <FilterLink
                    label="전체"
                    href="/organizations"
                    active={!type}
                  />
                </li>
                {ORG_TYPE_ORDER.map((t) => (
                  <li key={t}>
                    <FilterLink
                      label={ORG_TYPE_LABELS[t]}
                      href={`/organizations?type=${t}${region ? `&region=${encodeURIComponent(region)}` : ""}`}
                      active={type === t}
                    />
                  </li>
                ))}
              </ul>
            </div>

            {regions.length > 0 ? (
              <div>
                <div className="text-xs tracking-wider text-warm-gray uppercase mb-2">
                  지역
                </div>
                <ul className="space-y-1 text-sm">
                  <li>
                    <FilterLink
                      label="전체"
                      href={`/organizations${type ? `?type=${type}` : ""}`}
                      active={!region}
                    />
                  </li>
                  {regions.map(([r, n]) => (
                    <li key={r}>
                      <FilterLink
                        label={`${r} (${n})`}
                        href={`/organizations?${type ? `type=${type}&` : ""}region=${encodeURIComponent(r)}`}
                        active={region === r}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          {/* Grid */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-serif text-ink">
                기관 목록
                <span className="ml-2 text-sm text-warm-gray font-sans font-normal">
                  {orgs.length}곳
                </span>
              </h2>
            </div>

            {orgs.length === 0 ? (
              <div className="border border-dashed border-border rounded-md bg-white py-16 text-center">
                <div className="text-sm text-warm-gray">
                  조건에 맞는 기관이 없어요
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {orgs.map((o) => (
                  <OrgCard key={o.id} org={o} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block px-2 py-1.5 rounded-sm",
        active
          ? "bg-ink text-white"
          : "text-warm-gray hover:text-ink hover:bg-cream-start/40",
      )}
    >
      {label}
    </Link>
  );
}
