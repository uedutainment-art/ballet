import type { Timestamp } from "firebase/firestore";

// M11.7: external-facing inquiry/report channel. Every submission goes
// through the submitInquiry Cloud Function (clients can't write directly).
// Admin reviews from /admin/inquiries; nothing is auto-published.

export type InquiryType =
  | "NEW_CONTENT"     // A. 신규 콘텐츠 제보
  | "EDIT_REQUEST"    // B. 정보 수정 요청
  | "DELETE_REQUEST"  // C. 삭제 요청
  | "ORG_UPDATE"      // D. 기관 정보 수정
  | "GENERAL";        // E. 일반 문의

export type InquiryStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "DONE"
  | "REJECTED";

export type InquiryContentDomain =
  | "competition"
  | "admission"
  | "performance"
  | "video"
  | "organization";

export interface InquiryContentRef {
  domain: InquiryContentDomain;
  docId: string;
  title: string; // denormalized — admin queue rendering
}

export interface InquiryAttachment {
  storageUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface Inquiry {
  id: string;

  // Submission
  type: InquiryType;
  subject: string;
  message: string;
  email?: string;
  attachments: InquiryAttachment[];
  contentRef?: InquiryContentRef;

  // Processing
  status: InquiryStatus;
  assignedTo?: string;     // admin uid
  resolution?: string;     // internal note
  linkedDraftId?: string;  // A 유형 → DRAFT created from this inquiry
  rejectionReason?: string;

  // Security meta
  submitterIpHash?: string;
  userAgent?: string;
  recaptchaScore?: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  acknowledgedAt?: Timestamp;
  repliedAt?: Timestamp;
}

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  NEW_CONTENT: "신규 콘텐츠 제보",
  EDIT_REQUEST: "정보 수정 요청",
  DELETE_REQUEST: "삭제 요청",
  ORG_UPDATE: "기관 정보 수정",
  GENERAL: "일반 문의",
};

// Order shown in the dropdown.
export const INQUIRY_TYPE_ORDER: InquiryType[] = [
  "NEW_CONTENT",
  "EDIT_REQUEST",
  "DELETE_REQUEST",
  "ORG_UPDATE",
  "GENERAL",
];

// Per-type submission hint shown above the form. Empty for GENERAL.
export const INQUIRY_TYPE_HINTS: Record<InquiryType, string> = {
  NEW_CONTENT: "포스터·공식 페이지 URL을 함께 보내주시면 빠른 등록에 도움이 돼요.",
  EDIT_REQUEST: "수정 대상 페이지 URL 또는 정확한 제목을 함께 알려주세요.",
  DELETE_REQUEST: "기관 관계자이신 경우, 공식 이메일로 보내주시면 처리가 빨라요.",
  ORG_UPDATE: "변경된 로고·연락처를 첨부해 주시거나 메시지에 적어주세요.",
  GENERAL: "",
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "신규",
  IN_PROGRESS: "처리 중",
  DONE: "반영 완료",
  REJECTED: "거절",
};

// Dot color for the admin queue.
export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  NEW: "#dc2626",         // red
  IN_PROGRESS: "#d97706", // amber
  DONE: "#16a34a",        // green
  REJECTED: "#94a3b8",    // slate
};
