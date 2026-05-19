import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";

export type CompanyType =
  | "national"
  | "private"
  | "university"
  | "foreign"
  | "other";

export interface Performance {
  id: string;
  status: ContentStatus;
  title: string;
  company: string;
  companyType?: CompanyType;
  venue: string;
  dateStart: Timestamp;
  dateEnd: Timestamp;
  showtimes: string[]; // free-form session strings, e.g. "7/1 19:00"
  ticketPriceMin?: number;
  ticketPriceMax?: number;
  ticketUrl?: string;
  description?: string;
  choreographer?: string;
  composer?: string;
  runtime?: number; // minutes
  ageLimit?: string;
  posterUrl?: string;
  officialUrl: string;
  // Pipeline meta — mirrors Competition / Admission.
  source?: "pull" | "push" | "manual";
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

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  national: "국립·시립",
  private: "사립",
  university: "대학",
  foreign: "해외",
  other: "기타",
};

export const COMPANY_GRADIENTS: Record<CompanyType, [string, string]> = {
  national: ["#2C3E4A", "#1F2C36"],
  private: ["#6E7D8A", "#5A6975"],
  university: ["#C4A36B", "#A78751"],
  foreign: ["#8A8579", "#6E6B62"],
  other: ["#B0A89A", "#8E8676"],
};
