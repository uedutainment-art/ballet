import type { Timestamp } from "firebase/firestore";
import type { ContentStatus } from "./status";

export type VideoType = "short" | "long" | "live";

export type VideoSeries =
  | "levels"
  | "admission"
  | "competition"
  | "interview"
  | "review"
  | "other";

export type VideoLevel = "L0" | "L0.5" | "L1" | "L2" | "L3" | "L4";

export interface Video {
  id: string;
  status: ContentStatus;
  title: string;
  description?: string;
  youtubeUrl: string;
  youtubeId: string; // extracted from youtubeUrl
  thumbnailUrl: string; // derived: img.youtube.com/vi/{id}/hqdefault.jpg
  series: VideoSeries;
  type: VideoType;
  level?: VideoLevel;
  durationSeconds?: number;
  host?: string;
  relatedCompetitionIds: string[];
  relatedAdmissionIds: string[];
  relatedPerformanceIds: string[];
  // M10: optional pointers to /organizations/{id}. A single video can
  // reference multiple orgs (e.g. an interview at 한예종 about KIBC).
  relatedOrgIds?: string[];
  viewCount?: number;
  // Pipeline meta — mirrors other domains.
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

export const SERIES_LABELS: Record<VideoSeries, string> = {
  levels: "레벨 가이드",
  admission: "입시",
  competition: "콩쿠르",
  interview: "인터뷰",
  review: "리뷰",
  other: "기타",
};

export const LEVEL_LABELS: Record<VideoLevel, string> = {
  L0: "L0 입문",
  "L0.5": "L0.5 준비",
  L1: "L1 초급",
  L2: "L2 중급",
  L3: "L3 상급",
  L4: "L4 프로",
};

export const LEVEL_COLORS: Record<VideoLevel, string> = {
  L0: "#B0A89A",
  "L0.5": "#A78751",
  L1: "#6E7D8A",
  L2: "#5A6975",
  L3: "#2C3E4A",
  L4: "#C4A36B",
};

export const TYPE_LABELS: Record<VideoType, string> = {
  short: "쇼츠",
  long: "정규",
  live: "라이브",
};
