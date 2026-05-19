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
import {
  admissionConverter,
  competitionConverter,
  performanceConverter,
} from "@/lib/firebase/converters";
import type {
  Competition,
  CompetitionCategory,
} from "@/lib/types/competition";
import type { Admission, SchoolType } from "@/lib/types/admission";
import type { CompanyType, Performance } from "@/lib/types/performance";

const COL = "competitions";
const ADMISSIONS_COL = "admissions";
const PERFORMANCES_COL = "performances";

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

// ---------- Admissions (M7) ----------

export type ListAdmissionsOptions = {
  limit?: number;
  schoolType?: SchoolType;
  search?: string;
};

export async function listPublishedAdmissions(
  opts: ListAdmissionsOptions = {},
): Promise<Admission[]> {
  try {
    // No composite (status, schoolType, regEnd) index defined — keep the
    // server query simple (status equality only) and sort/filter the
    // small result set client-side.
    const q = query(
      collection(db, ADMISSIONS_COL).withConverter(admissionConverter),
      where("status", "==", "PUBLISHED"),
      fbLimit(opts.limit ?? 60),
    );
    const snap = await getDocs(q);
    let docs = snap.docs.map((d) => d.data());

    if (opts.schoolType) {
      docs = docs.filter((d) => d.schoolType === opts.schoolType);
    }
    if (opts.search) {
      const needle = opts.search.trim().toLowerCase();
      docs = docs.filter(
        (d) =>
          d.schoolName.toLowerCase().includes(needle) ||
          d.department.toLowerCase().includes(needle),
      );
    }
    docs.sort((a, b) => {
      const ta = a.regStart?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      const tb = b.regStart?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb; // earliest reg start first
    });
    return docs;
  } catch (err) {
    console.error("[queries] listPublishedAdmissions failed:", err);
    return [];
  }
}

export async function getAdmissionById(
  id: string,
): Promise<Admission | null> {
  try {
    const ref = doc(db, ADMISSIONS_COL, id).withConverter(admissionConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[queries] getAdmissionById(${id}) failed:`, err);
    return null;
  }
}

// Returns PUBLISHED admissions whose registration starts within the next
// `daysAhead` days, plus any already-open windows.
export async function listUrgentAdmissions(
  n: number,
  daysAhead = 60,
): Promise<Admission[]> {
  try {
    const all = await listPublishedAdmissions({ limit: 100 });
    const now = Date.now();
    const horizon = now + daysAhead * 24 * 60 * 60 * 1000;
    const filtered = all.filter((a) => {
      const regEnd = a.regEnd?.toMillis();
      const regStart = a.regStart?.toMillis();
      if (regEnd && regEnd < now) return false; // closed
      if (regStart && regStart > horizon) return false; // too far out
      return true;
    });
    return filtered.slice(0, n);
  } catch (err) {
    console.error("[queries] listUrgentAdmissions failed:", err);
    return [];
  }
}

// ---------- Performances (M8) ----------

export type ListPerformancesOptions = {
  limit?: number;
  companyType?: CompanyType;
  search?: string;
};

export async function listPublishedPerformances(
  opts: ListPerformancesOptions = {},
): Promise<Performance[]> {
  try {
    const q = query(
      collection(db, PERFORMANCES_COL).withConverter(performanceConverter),
      where("status", "==", "PUBLISHED"),
      fbLimit(opts.limit ?? 60),
    );
    const snap = await getDocs(q);
    let docs = snap.docs.map((d) => d.data());

    if (opts.companyType) {
      docs = docs.filter((d) => d.companyType === opts.companyType);
    }
    if (opts.search) {
      const needle = opts.search.trim().toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          d.company.toLowerCase().includes(needle),
      );
    }
    docs.sort((a, b) => {
      const ta = a.dateStart?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      const tb = b.dateStart?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb; // soonest show first
    });
    return docs;
  } catch (err) {
    console.error("[queries] listPublishedPerformances failed:", err);
    return [];
  }
}

export async function getPerformanceById(
  id: string,
): Promise<Performance | null> {
  try {
    const ref = doc(db, PERFORMANCES_COL, id).withConverter(
      performanceConverter,
    );
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[queries] getPerformanceById(${id}) failed:`, err);
    return null;
  }
}

// PUBLISHED performances whose dateStart is in the future, soonest first.
export async function listUpcomingPerformances(
  n: number,
): Promise<Performance[]> {
  try {
    const all = await listPublishedPerformances({ limit: 100 });
    const now = Date.now();
    const upcoming = all.filter((p) => {
      const end = p.dateEnd?.toMillis() ?? p.dateStart?.toMillis();
      return !end || end >= now;
    });
    return upcoming.slice(0, n);
  } catch (err) {
    console.error("[queries] listUpcomingPerformances failed:", err);
    return [];
  }
}
