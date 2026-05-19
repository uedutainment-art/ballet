import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";

export type SchoolType = "middle" | "high" | "university" | "grad";

export type CsatReflection =
  | "reflected"
  | "not_reflected"
  | "reference_only";

export interface Admission {
  id: string;
  status: ContentStatus;
  schoolType: SchoolType;
  schoolName: string;
  department: string;
  year: number;
  capacity?: number;
  regStart?: Timestamp;
  regEnd?: Timestamp;
  practical1?: Timestamp;
  practical2?: Timestamp;
  announcementAt?: Timestamp;
  subjects: string[];
  csat: CsatReflection;
  fee?: string;
  guidelineUrl?: string;
  officialUrl?: string;
  bonusCompetitions: string[]; // /competitions/{id}
  // Pipeline meta — mirrors Competition.
  aiCollectedAt: Timestamp;
  editorId?: string;
  reviewedAt?: Timestamp;
  adminId?: string;
  approvedBy?: string;
  publishedAt?: Timestamp;
  lastVerifiedAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  notes?: string;
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
}

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  middle: "예술중",
  high: "예술고",
  university: "대학",
  grad: "대학원",
};

export const CSAT_LABELS: Record<CsatReflection, string> = {
  reflected: "수능 반영",
  not_reflected: "수능 미반영",
  reference_only: "참고용",
};

// Initial-glyph color per school type for the round logo placeholder.
export const SCHOOL_TYPE_COLORS: Record<SchoolType, string> = {
  middle: "#6E7D8A",
  high: "#5A6975",
  university: "#2C3E4A",
  grad: "#C4A36B",
};
