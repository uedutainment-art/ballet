import Link from "next/link";
import { AdmissionCard } from "@/components/public/AdmissionCard";
import { listPublishedAdmissions } from "@/lib/firebase/queries";
import {
  SCHOOL_TYPE_LABELS,
  type SchoolType,
} from "@/lib/types/admission";
import { cn } from "@/lib/cn";

export const revalidate = 300;

type SearchParams = { schoolType?: string };

const TAB_TYPES: Array<{ key: SchoolType | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "middle", label: "예술중" },
  { key: "high", label: "예술고" },
  { key: "university", label: "대학" },
  { key: "grad", label: "대학원" },
];

function normalizeType(v?: string): SchoolType | undefined {
  if (v === "middle" || v === "high" || v === "university" || v === "grad") {
    return v;
  }
  return undefined;
}

export default async function AdmissionsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const schoolType = normalizeType(searchParams.schoolType);
  const items = await listPublishedAdmissions({ schoolType, limit: 100 });
  const activeKey: SchoolType | "all" = schoolType ?? "all";

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink">
            발레 입시
          </h1>
          <p className="mt-2 text-sm text-warm-gray">
            예술중·예술고·대학·대학원 입시 일정을 한눈에 확인하세요
          </p>
        </header>

        <nav className="flex gap-1 border-b border-border overflow-x-auto -mx-2 px-2">
          {TAB_TYPES.map((t) => {
            const active = activeKey === t.key;
            const href =
              t.key === "all" ? "/admissions" : `/admissions?schoolType=${t.key}`;
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
              {schoolType ?
                `${SCHOOL_TYPE_LABELS[schoolType]} 카테고리에 공개된 입시 정보가 없어요` :
                "공개된 입시 정보가 없어요"}
            </div>
            {schoolType ? (
              <Link
                href="/admissions"
                className="mt-3 inline-block text-xs text-brand hover:underline"
              >
                전체 보기 →
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((a) => (
              <AdmissionCard key={a.id} admission={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
