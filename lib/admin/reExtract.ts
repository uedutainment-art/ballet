"use client";

import {httpsCallable} from "firebase/functions";
import {functions} from "@/lib/firebase/client";

export type InputMode = "image" | "pdf" | "url" | "text";
export type ApplyMode = "overwrite" | "fill_empty" | "higher_confidence";
export type ReExtractDomain = "competition" | "admission" | "performance";

export type ReExtractRequest = {
  docId: string;
  domain: ReExtractDomain;
  mode: InputMode;
  applyMode: ApplyMode;
  payload: {
    dataUrl?: string;
    url?: string;
    text?: string;
  };
};

export type ReExtractResponse = {
  success: boolean;
  fieldsUpdated: string[];
  confidence: number;
  fieldNotes: Record<string, string>;
};

const APPLY_MODE_LABELS: Record<ApplyMode, string> = {
  overwrite: "모든 필드 덮어쓰기",
  fill_empty: "빈 필드만 채움",
  higher_confidence: "신뢰도 높은 값으로 교체",
};

const APPLY_MODE_HINTS: Record<ApplyMode, string> = {
  fill_empty: "기존 데이터는 그대로, 비어 있는 필드만 새 값으로",
  overwrite: "처음부터 다시. 기존 데이터가 사라집니다",
  higher_confidence: "AI가 더 확실하다고 판단할 때만 교체",
};

export const APPLY_MODES: ApplyMode[] = [
  "fill_empty",
  "overwrite",
  "higher_confidence",
];

export function applyModeLabel(m: ApplyMode): string {
  return APPLY_MODE_LABELS[m];
}

export function applyModeHint(m: ApplyMode): string {
  return APPLY_MODE_HINTS[m];
}

export async function callReExtract(
  req: ReExtractRequest,
): Promise<ReExtractResponse> {
  const callable = httpsCallable<ReExtractRequest, ReExtractResponse>(
    functions,
    "extractFromInput",
  );
  const res = await callable(req);
  return res.data;
}
