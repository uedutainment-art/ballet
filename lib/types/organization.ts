import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";

// Organization — shared master data referenced by competitions / admissions /
// performances / videos. The "host", "school", "company", "venue" string
// fields on those collections are still kept (denormalized) for cheap
// rendering; orgId is the canonical link.

export type OrgType =
  | "UNIVERSITY"
  | "HIGH_SCHOOL"
  | "MIDDLE_SCHOOL"
  | "ACADEMY"
  | "ASSOCIATION"
  | "COMPANY"
  | "COMPETITION_HOST"
  | "PERFORMANCE_HALL"
  | "OTHER";

export interface OrganizationSocialLinks {
  instagram?: string;
  youtube?: string;
  facebook?: string;
}

export interface Organization {
  id: string;

  // Identity
  name: string;            // 정식 한국어명
  shortName?: string;      // 약칭 (한예종)
  englishName?: string;
  aliases: string[];       // 검색용 별칭들 (always an array, may be empty)

  type: OrgType;

  // Visual
  logoUrl?: string;
  logoSourceUrl?: string;  // 원본 출처 URL (감사용)

  // Contact
  websiteUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  region?: string;         // 서울/경기/부산...

  // Extra
  description?: string;
  establishedYear?: number;
  socialLinks?: OrganizationSocialLinks;
  tags: string[];

  // Status / lifecycle
  // `status` mirrors a soft active/inactive flag; `workflowState` is the
  // editorial pipeline (same 5-stage pattern as Competition.status, etc.).
  status: "ACTIVE" | "INACTIVE";
  workflowState: ContentStatus;

  // Meta
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  source?: "pull" | "push" | "manual";

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  editorId?: string;
  reviewedAt?: Timestamp;
  adminId?: string;
  approvedBy?: string;
  publishedAt?: Timestamp;
  lastVerifiedAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  notes?: string;
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  UNIVERSITY: "대학교",
  HIGH_SCHOOL: "예술고",
  MIDDLE_SCHOOL: "예술중",
  ACADEMY: "학원·스튜디오",
  ASSOCIATION: "협회",
  COMPANY: "발레단",
  COMPETITION_HOST: "콩쿠르 주관",
  PERFORMANCE_HALL: "공연장",
  OTHER: "기타",
};

// Order for filter tabs in the directory page.
export const ORG_TYPE_ORDER: OrgType[] = [
  "UNIVERSITY",
  "HIGH_SCHOOL",
  "MIDDLE_SCHOOL",
  "COMPANY",
  "ASSOCIATION",
  "COMPETITION_HOST",
  "PERFORMANCE_HALL",
  "ACADEMY",
  "OTHER",
];

// Initial-glyph color per type for the logo placeholder.
export const ORG_TYPE_COLORS: Record<OrgType, string> = {
  UNIVERSITY: "#2C3E4A",
  HIGH_SCHOOL: "#5A6975",
  MIDDLE_SCHOOL: "#6E7D8A",
  ACADEMY: "#8A8579",
  ASSOCIATION: "#A78751",
  COMPANY: "#C4A36B",
  COMPETITION_HOST: "#6E6B62",
  PERFORMANCE_HALL: "#B0A89A",
  OTHER: "#8E8676",
};

export const ORG_REGIONS: readonly string[] = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "해외",
];
