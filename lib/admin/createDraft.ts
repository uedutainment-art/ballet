// Shared "create blank DRAFT" helper used by every domain's admin list page.
// Mirrors the /admin/organizations createBlank pattern. Returns the new doc id
// so the caller can route to /admin/{collection}/{id} immediately.
//
// Defaults are picked so the editor loads with sensible enum values and
// non-undefined Select state. Required text/url fields are intentionally
// left blank — zod will surface them on save and the operator fills them in.

import {
  addDoc,
  collection,
  serverTimestamp,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type DraftDomain =
  | "competition"
  | "admission"
  | "performance"
  | "video";

export const DRAFT_COLLECTION: Record<DraftDomain, string> = {
  competition: "competitions",
  admission: "admissions",
  performance: "performances",
  video: "videos",
};

function basePayload(uid: string): Record<string, unknown> {
  return {
    status: "DRAFT",
    source: "manual",
    createdBy: uid,
    createdAt: serverTimestamp(),
    aiCollectedAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  };
}

// Per-domain defaults. Required enums get sane initial values so the form
// doesn't render with an undefined Select. Free-text required fields are
// blank — the operator must fill them before the editor's zod gate passes.
function draftPayloadFor(domain: DraftDomain, uid: string): Record<string, unknown> {
  const base = basePayload(uid);
  switch (domain) {
  case "competition":
    return {
      ...base,
      name: "",
      host: "",
      venue: "",
      category: "domestic_general",
      sections: [],
      ageGroups: [],
      officialUrl: "",
    };
  case "admission":
    return {
      ...base,
      schoolName: "",
      department: "",
      schoolType: "university",
      // Default year = next academic year. Operator can change.
      year: new Date().getFullYear() + 1,
      subjects: [],
      csat: "not_reflected",
      bonusCompetitions: [],
    };
  case "performance":
    return {
      ...base,
      title: "",
      company: "",
      venue: "",
      showtimes: [],
      officialUrl: "",
    };
  case "video":
    return {
      ...base,
      title: "",
      youtubeUrl: "",
      youtubeId: "",
      thumbnailUrl: "",
      series: "other",
      type: "long",
      relatedCompetitionIds: [],
      relatedAdmissionIds: [],
      relatedPerformanceIds: [],
    };
  }
}

export async function createBlankDraft(
  domain: DraftDomain,
  uid: string,
): Promise<DocumentReference> {
  const payload = draftPayloadFor(domain, uid);
  return addDoc(collection(db, DRAFT_COLLECTION[domain]), payload);
}
