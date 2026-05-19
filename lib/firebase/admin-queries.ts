import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { competitionConverter } from "@/lib/firebase/converters";
import type { Competition } from "@/lib/types/competition";
import type { ContentStatus } from "@/lib/types/status";

const COL = "competitions";

const ALL_STATUSES: ContentStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
];

const EMPTY_COUNTS: Record<ContentStatus, number> = {
  DRAFT: 0,
  IN_REVIEW: 0,
  READY: 0,
  PUBLISHED: 0,
  ARCHIVED: 0,
};

export async function countByStatus(): Promise<Record<ContentStatus, number>> {
  try {
    const pairs = await Promise.all(
      ALL_STATUSES.map(async (s) => {
        const q = query(collection(db, COL), where("status", "==", s));
        const snap = await getCountFromServer(q);
        return [s, snap.data().count] as const;
      }),
    );
    return Object.fromEntries(pairs) as Record<ContentStatus, number>;
  } catch (err) {
    console.error("[admin-queries] countByStatus failed:", err);
    return { ...EMPTY_COUNTS };
  }
}

export async function listByStatus(
  status: ContentStatus,
  limit = 30,
): Promise<Competition[]> {
  try {
    const q = query(
      collection(db, COL).withConverter(competitionConverter),
      where("status", "==", status),
      orderBy("aiCollectedAt", "desc"),
      fbLimit(limit),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error(`[admin-queries] listByStatus(${status}) failed:`, err);
    return [];
  }
}

export async function listUrgentPublished(n: number): Promise<Competition[]> {
  try {
    const now = Timestamp.now();
    const max = Timestamp.fromDate(
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    );
    const q = query(
      collection(db, COL).withConverter(competitionConverter),
      where("status", "==", "PUBLISHED"),
      where("registrationEnd", ">=", now),
      where("registrationEnd", "<=", max),
      orderBy("registrationEnd", "asc"),
      fbLimit(n),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error("[admin-queries] listUrgentPublished failed:", err);
    return [];
  }
}

// Placeholder until Cloud Functions write to editLogs in T5.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listRecentEdits(n = 5): Promise<unknown[]> {
  return [];
}

export async function approveCompetition(
  id: string,
  adminUid: string,
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: "PUBLISHED",
    approvedBy: adminUid,
    publishedAt: serverTimestamp(),
  });
}
