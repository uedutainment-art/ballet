// Shared content lifecycle status used by competitions, admissions, videos, etc.

export type ContentStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "READY"
  | "PUBLISHED"
  | "ARCHIVED";

export const PUBLISHED: ContentStatus = "PUBLISHED";
