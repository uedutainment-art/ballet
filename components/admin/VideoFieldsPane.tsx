"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfidenceMeter } from "@/components/admin/ConfidenceMeter";
import {
  LEVEL_LABELS,
  SERIES_LABELS,
  TYPE_LABELS,
} from "@/lib/types/video";
import type { VideoFormValues } from "@/lib/zod/video";
import type { AutosaveStatus } from "@/lib/admin/useAutosave";
import { cn } from "@/lib/cn";

type Props = {
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  autosave: AutosaveStatus;
  recentlyUpdated?: ReadonlySet<string>;
};

const FIRESTORE_TO_FORM: Record<string, string> = {
  relatedCompetitionIds: "relatedCompetitionIdsCsv",
  relatedAdmissionIds: "relatedAdmissionIdsCsv",
  relatedPerformanceIds: "relatedPerformanceIdsCsv",
};

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function VideoFieldsPane({
  aiConfidence,
  aiFieldNotes,
  autosave,
  recentlyUpdated,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<VideoFormValues>();

  const lowConfidence =
    typeof aiConfidence === "number" && aiConfidence < 60;

  const highlight = (formField: string): boolean => {
    if (!recentlyUpdated || recentlyUpdated.size === 0) return false;
    if (recentlyUpdated.has(formField)) return true;
    for (const [fsName, formName] of Object.entries(FIRESTORE_TO_FORM)) {
      if (formName === formField && recentlyUpdated.has(fsName)) return true;
    }
    return false;
  };

  return (
    <section className="bg-white border border-border rounded-md p-4 flex flex-col gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-ink">
            ✏ 영상 정보 — 편집
          </div>
          <ConfidenceMeter value={aiConfidence} />
        </div>
        <AutosaveIndicator autosave={autosave} />
      </header>

      {lowConfidence ? (
        <div className="flex items-center gap-2 rounded-sm bg-amber-50 text-amber-800 text-xs px-3 py-2">
          <AlertTriangle className="size-3.5" />
          AI 신뢰도가 낮아요. 모든 필드를 꼼꼼히 확인해 주세요.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="제목"
          required
          note={aiFieldNotes?.title}
          error={errors.title?.message}
          className="md:col-span-2"
          highlighted={highlight("title")}
        >
          <Input {...register("title")} />
        </Field>

        <Field
          label="YouTube URL"
          required
          hint="저장하면 ID·썸네일 자동 추출"
          note={aiFieldNotes?.youtubeUrl}
          error={errors.youtubeUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("youtubeUrl")}
        >
          <Input
            type="url"
            {...register("youtubeUrl")}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>

        <Field label="시리즈" required note={aiFieldNotes?.series} error={errors.series?.message} highlighted={highlight("series")}>
          <Select {...register("series")}>
            {(Object.keys(SERIES_LABELS) as Array<keyof typeof SERIES_LABELS>).map((k) => (
              <option key={k} value={k}>
                {SERIES_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="영상 유형" required note={aiFieldNotes?.type} error={errors.type?.message} highlighted={highlight("type")}>
          <Select {...register("type")}>
            {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((k) => (
              <option key={k} value={k}>
                {TYPE_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="레벨" note={aiFieldNotes?.level} error={errors.level?.message} highlighted={highlight("level")}>
          <Select {...register("level")}>
            <option value="">선택 안 함</option>
            {(Object.keys(LEVEL_LABELS) as Array<keyof typeof LEVEL_LABELS>).map((k) => (
              <option key={k} value={k}>
                {LEVEL_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="길이 (초)" hint="없으면 비워두기" note={aiFieldNotes?.durationSeconds} error={errors.durationSeconds?.message} highlighted={highlight("durationSeconds")}>
          <Input
            type="number"
            min={0}
            {...register("durationSeconds", { valueAsNumber: true })}
            placeholder="예: 720"
          />
        </Field>

        <Field
          label="진행자 / 채널"
          note={aiFieldNotes?.host}
          error={errors.host?.message}
          className="md:col-span-2"
          highlighted={highlight("host")}
        >
          <Input {...register("host")} placeholder="예: K BALLET TV" />
        </Field>

        <Field
          label="설명"
          hint="2000자 이하"
          note={aiFieldNotes?.description}
          error={errors.description?.message}
          className="md:col-span-2"
          highlighted={highlight("description")}
        >
          <Textarea rows={4} {...register("description")} />
        </Field>

        <Field
          label="관련 콩쿠르 ID"
          hint="쉼표로 구분 — Firestore doc ID"
          note={aiFieldNotes?.relatedCompetitionIds}
          error={errors.relatedCompetitionIdsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("relatedCompetitionIdsCsv")}
        >
          <Input
            {...register("relatedCompetitionIdsCsv")}
            placeholder="예: kibc-2026, ygp-korea-2026"
          />
        </Field>

        <Field
          label="관련 입시 ID"
          hint="쉼표로 구분"
          note={aiFieldNotes?.relatedAdmissionIds}
          error={errors.relatedAdmissionIdsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("relatedAdmissionIdsCsv")}
        >
          <Input
            {...register("relatedAdmissionIdsCsv")}
            placeholder="예: karts-2027"
          />
        </Field>

        <Field
          label="관련 공연 ID"
          hint="쉼표로 구분"
          note={aiFieldNotes?.relatedPerformanceIds}
          error={errors.relatedPerformanceIdsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("relatedPerformanceIdsCsv")}
        >
          <Input
            {...register("relatedPerformanceIdsCsv")}
            placeholder="예: knb-swan-lake-2026"
          />
        </Field>

        <Field
          label="비고"
          note={aiFieldNotes?.notes}
          error={errors.notes?.message}
          className="md:col-span-2"
          highlighted={highlight("notes")}
        >
          <Textarea rows={3} {...register("notes")} />
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  note,
  error,
  children,
  className,
  highlighted,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm transition-colors duration-700",
        highlighted ?
          "bg-green-50/80 ring-1 ring-green-300 -m-1 p-1" :
          "ring-0",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs text-warm-gray">
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
        {note ? (
          <span
            title={note}
            className="inline-flex items-center text-amber-600 cursor-help"
            aria-label={`AI 노트: ${note}`}
          >
            <AlertTriangle className="size-3" />
          </span>
        ) : null}
        {hint ? (
          <span className="text-[10px] text-warm-gray/70">· {hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="mt-1 text-[11px] text-red-600">{error}</div>
      ) : null}
    </div>
  );
}

function AutosaveIndicator({ autosave }: { autosave: AutosaveStatus }) {
  if (autosave.error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600">
        <AlertTriangle className="size-3" />
        저장 실패
      </span>
    );
  }
  if (autosave.saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-warm-gray">
        <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
        저장 중…
      </span>
    );
  }
  if (autosave.lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-warm-gray">
        <span className="size-1.5 rounded-full bg-green-500" />
        저장됨 · {formatTime(autosave.lastSavedAt)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-warm-gray/60">
      <span className="size-1.5 rounded-full bg-warm-gray/30" />
      대기 중
    </span>
  );
}
