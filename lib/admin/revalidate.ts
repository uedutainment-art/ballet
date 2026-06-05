// Client helper used by status transitions to flush the public-side ISR
// cache for the relevant paths the moment a doc goes PUBLISHED.

import { auth } from "@/lib/firebase/client";
import type { EditLogDocType } from "@/lib/types/editLog";

const COLLECTION_BY_TYPE: Record<EditLogDocType, string> = {
  competition: "competitions",
  admission: "admissions",
  performance: "performances",
  video: "videos",
  organization: "organizations",
};

// Per-domain path set. Home is always invalidated since every domain has a
// slot there. The list page and the specific detail page both flush so the
// operator sees their change in either entry point.
export function publicPathsFor(
  docType: EditLogDocType,
  docId: string,
): string[] {
  const col = COLLECTION_BY_TYPE[docType];
  return ["/", `/${col}`, `/${col}/${docId}`];
}

// Fire-and-forget. The caller's success path must NOT depend on this —
// revalidation is a UX nicety, not a correctness gate. Any failure is logged
// to the console so the operator can spot mis-configurations without
// blocking publishing.
export async function callRevalidate(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const user = auth.currentUser;
  if (!user) {
    console.warn("[revalidate] no auth user; skipping");
    return;
  }
  try {
    const token = await user.getIdToken();
    const resp = await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
    });
    if (!resp.ok) {
      console.warn(
        `[revalidate] HTTP ${resp.status}:`,
        await resp.text().catch(() => "(no body)"),
      );
      return;
    }
    const data = (await resp.json().catch(() => null)) as
      | { revalidated?: string[]; rejected?: string[] }
      | null;
    if (data?.rejected && data.rejected.length > 0) {
      console.warn("[revalidate] paths rejected:", data.rejected);
    }
  } catch (err) {
    console.warn("[revalidate] threw:", err);
  }
}
