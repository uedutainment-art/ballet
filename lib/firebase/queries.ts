import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  type QueryConstraint,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { competitionConverter } from "@/lib/firebase/converters";
import type {
  Competition,
  CompetitionCategory,
} from "@/lib/types/competition";

const COL = "competitions";

export type ListCompetitionsOptions = {
  limit?: number;
  category?: CompetitionCategory;
  regionContains?: string;
  periodFrom?: Date;
  periodTo?: Date;
  search?: string;
};

// Composite indexes used (already defined in firestore.indexes.json):
//   (status ASC, registrationEnd ASC)
//   (status ASC, category ASC, registrationEnd ASC)
//
// Filters that Firestore can't combine in one query (regionContains, search,
// period range when category is also set) are applied client-side after the
// initial fetch. Acceptable while result counts stay small; switch to a
// dedicated search index (Algolia / Typesense) when volume grows.

export async function listPublishedCompetitions(
  opts: ListCompetitionsOptions = {},
): Promise<Competition[]> {
  try {
    const constraints: QueryConstraint[] = [
      where("status", "==", "PUBLISHED"),
    ];
    if (opts.category) {
      constraints.push(where("category", "==", opts.category));
    }
    constraints.push(orderBy("registrationEnd", "asc"));
    if (opts.limit) constraints.push(fbLimit(opts.limit));

    const q = query(
      collection(db, COL).withConverter(competitionConverter),
      ...constraints,
    );
    const snap = await getDocs(q);
    let docs = snap.docs.map((d) => d.data());

    if (opts.regionContains) {
      const needle = opts.regionContains.trim();
      docs = docs.filter((d) => d.venue?.includes(needle));
    }
    if (opts.search) {
      const needle = opts.search.trim().toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(needle) ||
          d.host.toLowerCase().includes(needle),
      );
    }
    if (opts.periodFrom) {
      const from = opts.periodFrom.getTime();
      docs = docs.filter((d) => d.dateStart?.toMillis() >= from);
    }
    if (opts.periodTo) {
      const to = opts.periodTo.getTime();
      docs = docs.filter((d) => d.dateStart?.toMillis() <= to);
    }
    return docs;
  } catch (err) {
    console.error("[queries] listPublishedCompetitions failed:", err);
    return [];
  }
}

export async function getCompetitionById(
  id: string,
): Promise<Competition | null> {
  try {
    const ref = doc(db, COL, id).withConverter(competitionConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[queries] getCompetitionById(${id}) failed:`, err);
    return null;
  }
}

export async function listUrgentCompetitions(
  n: number,
): Promise<Competition[]> {
  try {
    const now = Timestamp.fromDate(new Date());
    const q = query(
      collection(db, COL).withConverter(competitionConverter),
      where("status", "==", "PUBLISHED"),
      where("registrationEnd", ">=", now),
      orderBy("registrationEnd", "asc"),
      fbLimit(n),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error("[queries] listUrgentCompetitions failed:", err);
    return [];
  }
}
