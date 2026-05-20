import Link from "next/link";
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  type Organization,
} from "@/lib/types/organization";

type Props = { org: Organization };

export function OrgCard({ org }: Props) {
  const initial = (org.shortName || org.name).trim().charAt(0) || "?";
  return (
    <Link
      href={`/organizations/${org.id}`}
      className="group block bg-white border border-border rounded-md p-4 hover:border-brand transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 rounded-sm overflow-hidden border border-border bg-white shrink-0">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={`${org.name} 로고`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: ORG_TYPE_COLORS[org.type] }}
            >
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink font-medium truncate group-hover:underline">
            {org.name}
          </div>
          {org.shortName && org.shortName !== org.name ? (
            <div className="text-[11px] text-warm-gray mt-0.5 truncate">
              {org.shortName}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-warm-gray">
            <span
              className="inline-block px-1.5 py-0.5 rounded-sm border border-border text-warm-gray"
            >
              {ORG_TYPE_LABELS[org.type]}
            </span>
            {org.region ? <span>· {org.region}</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
