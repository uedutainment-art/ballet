import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";
import type { CrawlMeta } from "./crawlRun";

export type CompetitionCategory =
  | "domestic_major" // 국내 대형
  | "domestic_general" // 국내 일반
  | "intl_korea_round" // 국제 한국예선
  | "abroad_admission" // 해외 유학
  | "regional"; // 지역

export type CompetitionSource = "pull" | "push";

export interface Competition {
  id: string;
  status: ContentStatus;
  category: CompetitionCategory;
  name: string;
  host: string;
  // M10: optional pointer to /organizations/{id}. `host` stays denormalized
  // so existing UI keeps working without a join.
  hostOrgId?: string;
  edition?: string;
  dateStart: Timestamp;
  dateEnd: Timestamp;
  registrationStart?: Timestamp;
  registrationEnd?: Timestamp;
  venue: string;
  sections: string[];
  ageGroups: string[];
  fee?: string;
  awards?: string;
  officialUrl: string;
  registerUrl?: string;
  posterUrl?: string;
  source: CompetitionSource;
  aiCollectedAt: Timestamp;
  publishedAt?: Timestamp;
  lastVerifiedAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  // Set by editors / admins as they move the doc through the lifecycle.
  editorId?: string;
  reviewedAt?: Timestamp;
  adminId?: string;
  approvedBy?: string;
  notes?: string;
  // Set by the AI ingestion pipeline (T6). Optional until that lands.
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  // M11: Provenance for crawler-created DRAFTs. Absent on manual entries
  // and on legacy docs created before M11.
  crawlMeta?: CrawlMeta;
}

export const CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  domestic_major: "국내 대형",
  domestic_general: "국내 일반",
  intl_korea_round: "국제 한국예선",
  abroad_admission: "해외 유학",
  regional: "지역",
};

// Hex pairs used as a poster fallback when posterUrl is missing.
export const CATEGORY_GRADIENTS: Record<
  CompetitionCategory,
  [string, string]
> = {
  domestic_major: ["#6E7D8A", "#5A6975"],
  domestic_general: ["#8A8579", "#6E6B62"],
  intl_korea_round: ["#C4A36B", "#A78751"],
  abroad_admission: ["#2C3E4A", "#1F2C36"],
  regional: ["#B0A89A", "#8E8676"],
};
