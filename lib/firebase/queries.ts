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
  organizationConverter,
  performanceConverter,
  videoConverter,
} from "@/lib/firebase/converters";
import type {
  Competition,
  CompetitionCategory,
} from "@/lib/types/competition";
import type { Admission, SchoolType } from "@/lib/types/admission";
import type { CompanyType, Performance } from "@/lib/types/performance";
import type {
  Video,
  VideoLevel,
  VideoSeries,
} from "@/lib/types/video";
import type { Organization, OrgType } from "@/lib/types/organization";

const COL = "competitions";
const ADMISSIONS_COL = "admissions";
const PERFORMANCES_COL = "performances";
const VIDEOS_COL = "videos";
const ORGS_COL = "organizations";

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

// ---------- Videos (M9) ----------

export type ListVideosOptions = {
  limit?: number;
  series?: VideoSeries;
  level?: VideoLevel;
  search?: string;
};

export async function listPublishedVideos(
  opts: ListVideosOptions = {},
): Promise<Video[]> {
  try {
    const q = query(
      collection(db, VIDEOS_COL).withConverter(videoConverter),
      where("status", "==", "PUBLISHED"),
      fbLimit(opts.limit ?? 60),
    );
    const snap = await getDocs(q);
    let docs = snap.docs.map((d) => d.data());

    if (opts.series) docs = docs.filter((d) => d.series === opts.series);
    if (opts.level) docs = docs.filter((d) => d.level === opts.level);
    if (opts.search) {
      const needle = opts.search.trim().toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(needle));
    }
    docs.sort((a, b) => {
      const ta = a.publishedAt?.toMillis() ?? a.aiCollectedAt?.toMillis() ?? 0;
      const tb = b.publishedAt?.toMillis() ?? b.aiCollectedAt?.toMillis() ?? 0;
      return tb - ta; // newest first
    });
    return docs;
  } catch (err) {
    console.error("[queries] listPublishedVideos failed:", err);
    return [];
  }
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const ref = doc(db, VIDEOS_COL, id).withConverter(videoConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[queries] getVideoById(${id}) failed:`, err);
    return null;
  }
}

export async function listLatestVideos(n: number): Promise<Video[]> {
  return (await listPublishedVideos({ limit: Math.max(n, 12) })).slice(0, n);
}

export async function listVideosByLevel(
  level: VideoLevel,
  n = 30,
): Promise<Video[]> {
  return listPublishedVideos({ level, limit: n });
}

export async function listVideosBySeries(
  series: VideoSeries,
  n = 30,
): Promise<Video[]> {
  return listPublishedVideos({ series, limit: n });
}

// ---------- Organizations (M10) ----------

export type ListOrganizationsOptions = {
  limit?: number;
  type?: OrgType | OrgType[];
  region?: string;
  search?: string;
};

// Published-and-active organizations only — anything still in DRAFT/IN_REVIEW
// or marked INACTIVE is hidden from the public side.
export async function listPublishedOrganizations(
  opts: ListOrganizationsOptions = {},
): Promise<Organization[]> {
  try {
    const q = query(
      collection(db, ORGS_COL).withConverter(organizationConverter),
      where("workflowState", "==", "PUBLISHED"),
      fbLimit(opts.limit ?? 200),
    );
    const snap = await getDocs(q);
    let docs = snap.docs
      .map((d) => d.data())
      .filter((o) => o.status !== "INACTIVE");

    if (opts.type) {
      const wanted = Array.isArray(opts.type) ? opts.type : [opts.type];
      docs = docs.filter((o) => wanted.includes(o.type));
    }
    if (opts.region) {
      const needle = opts.region.trim();
      docs = docs.filter((o) => o.region === needle);
    }
    if (opts.search) {
      const needle = opts.search.trim().toLowerCase();
      docs = docs.filter(
        (o) =>
          o.name.toLowerCase().includes(needle) ||
          (o.shortName ?? "").toLowerCase().includes(needle) ||
          (o.englishName ?? "").toLowerCase().includes(needle) ||
          (o.aliases ?? []).some((a) => a.toLowerCase().includes(needle)),
      );
    }
    docs.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return docs;
  } catch (err) {
    console.error("[queries] listPublishedOrganizations failed:", err);
    return [];
  }
}

export async function getOrganizationById(
  id: string,
): Promise<Organization | null> {
  try {
    const ref = doc(db, ORGS_COL, id).withConverter(organizationConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error(`[queries] getOrganizationById(${id}) failed:`, err);
    return null;
  }
}

// Resolve multiple org IDs in one shot. Returns a map keyed by id; missing
// ids are simply absent. Used to inline org names + logos in detail pages.
export async function getOrganizationsByIds(
  ids: string[],
): Promise<Record<string, Organization>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  try {
    const results = await Promise.all(unique.map((id) => getOrganizationById(id)));
    const out: Record<string, Organization> = {};
    for (let i = 0; i < unique.length; i++) {
      const o = results[i];
      if (o) out[unique[i]] = o;
    }
    return out;
  } catch (err) {
    console.error("[queries] getOrganizationsByIds failed:", err);
    return {};
  }
}

// Lookup competitions/admissions/performances/videos that reference an org.
// Each helper applies the relevant orgId field. Used by /organizations/[id].
export async function listCompetitionsByHostOrg(
  orgId: string,
): Promise<Competition[]> {
  try {
    const q = query(
      collection(db, COL).withConverter(competitionConverter),
      where("status", "==", "PUBLISHED"),
      where("hostOrgId", "==", orgId),
      fbLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error(`[queries] listCompetitionsByHostOrg(${orgId}) failed:`, err);
    return [];
  }
}

export async function listAdmissionsBySchoolOrg(
  orgId: string,
): Promise<Admission[]> {
  try {
    const q = query(
      collection(db, ADMISSIONS_COL).withConverter(admissionConverter),
      where("status", "==", "PUBLISHED"),
      where("schoolOrgId", "==", orgId),
      fbLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error(`[queries] listAdmissionsBySchoolOrg(${orgId}) failed:`, err);
    return [];
  }
}

export async function listPerformancesByOrg(
  orgId: string,
): Promise<Performance[]> {
  try {
    // A performance can reference an org as either company or venue. We
    // can't OR these on Firestore side; run two queries and dedupe.
    const [byCompany, byVenue] = await Promise.all([
      getDocs(
        query(
          collection(db, PERFORMANCES_COL).withConverter(performanceConverter),
          where("status", "==", "PUBLISHED"),
          where("companyOrgId", "==", orgId),
          fbLimit(50),
        ),
      ),
      getDocs(
        query(
          collection(db, PERFORMANCES_COL).withConverter(performanceConverter),
          where("status", "==", "PUBLISHED"),
          where("venueOrgId", "==", orgId),
          fbLimit(50),
        ),
      ),
    ]);
    const map = new Map<string, Performance>();
    for (const snap of [...byCompany.docs, ...byVenue.docs]) {
      const p = snap.data();
      map.set(p.id, p);
    }
    return Array.from(map.values());
  } catch (err) {
    console.error(`[queries] listPerformancesByOrg(${orgId}) failed:`, err);
    return [];
  }
}

export async function listVideosByRelatedOrg(
  orgId: string,
): Promise<Video[]> {
  try {
    const q = query(
      collection(db, VIDEOS_COL).withConverter(videoConverter),
      where("status", "==", "PUBLISHED"),
      where("relatedOrgIds", "array-contains", orgId),
      fbLimit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    console.error(`[queries] listVideosByRelatedOrg(${orgId}) failed:`, err);
    return [];
  }
}

// Lightweight search for the admin OrgCombobox autocomplete. Fetches a small
// PUBLISHED set and filters client-side — fine while org count stays small.
export async function searchOrganizationsForCombobox(
  needle: string,
  typeFilter?: OrgType | OrgType[],
  limitTotal = 10,
): Promise<Organization[]> {
  const all = await listPublishedOrganizations({
    limit: 200,
    type: typeFilter,
  });
  const q = needle.trim().toLowerCase();
  if (!q) return all.slice(0, limitTotal);
  const matched = all.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      (o.shortName ?? "").toLowerCase().includes(q) ||
      (o.englishName ?? "").toLowerCase().includes(q) ||
      (o.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
  );
  return matched.slice(0, limitTotal);
}
