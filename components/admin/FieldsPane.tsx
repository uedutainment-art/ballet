"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfidenceMeter } from "@/components/admin/ConfidenceMeter";
import { CATEGORY_LABELS } from "@/lib/types/competition";
import type { CompetitionFormValues } from "@/lib/zod/competition";
import type { AutosaveStatus } from "@/lib/admin/useAutosave";
import { cn } from "@/lib/cn";

type Props = {
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  autosave: AutosaveStatus;
  // Form field names that were just updated by a re-extract. They render
  // with a fading green halo for ~1.5s. Empty Set = no highlight.
  recentlyUpdated?: ReadonlySet<string>;
};

// Map Firestore field names (what the re-extract function returns) to the
// form field names (what react-hook-form uses).
const FIRESTORE_TO_FORM: Record<string, string> = {
  sections: "sectionsCsv",
  ageGroups: "ageGroupsCsv",
};

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function FieldsPane({
  aiConfidence,
  aiFieldNotes,
  autosave,
  recentlyUpdated,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<CompetitionFormValues>();

  const lowConfidence =
    typeof aiConfidence === "number" && aiConfidence < 60;

  const highlight = (formField: string): boolean => {
    if (!recentlyUpdated || recentlyUpdated.size === 0) return false;
    if (recentlyUpdated.has(formField)) return true;
    // Re-extract returns Firestore field names (sections, ageGroups). Map
    // those to the corresponding form field name (sectionsCsv, ageGroupsCsv).
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
            ✏ AI 추출 결과 — 편집
          </div>
          <ConfidenceMeter value={aiConfidence} />
        </div>
        <AutosaveIndicator autosave={autosave} />
      </header>

      {lowConfidence ? (
        <div className="flex items-center gap-2 rounded-sm bg-amber-50 text-amber-800 text-xs px-3 py-2">
          <AlertTriangle className="size-3.5" />
          AI 신뢰도가 낮은 항목이에요. 모든 필드를 꼼꼼히 확인해 주세요.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="대회명" required note={aiFieldNotes?.name} error={errors.name?.message} highlighted={highlight("name")}>
          <Input {...register("name")} />
        </Field>

        <Field label="카테고리" required note={aiFieldNotes?.category} error={errors.category?.message} highlighted={highlight("category")}>
          <Select {...register("category")}>
            {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
              (k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field label="주최" required note={aiFieldNotes?.host} error={errors.host?.message} highlighted={highlight("host")}>
          <Input {...register("host")} />
        </Field>

        <Field label="회차" note={aiFieldNotes?.edition} error={errors.edition?.message} highlighted={highlight("edition")}>
          <Input {...register("edition")} placeholder="예: 제8회" />
        </Field>

        <Field label="시작일" required note={aiFieldNotes?.dateStart} error={errors.dateStart?.message} highlighted={highlight("dateStart")}>
          <Input type="date" {...register("dateStart")} />
        </Field>

        <Field label="종료일" required note={aiFieldNotes?.dateEnd} error={errors.dateEnd?.message} highlighted={highlight("dateEnd")}>
          <Input type="date" {...register("dateEnd")} />
        </Field>

        <Field label="접수 시작" note={aiFieldNotes?.registrationStart} error={errors.registrationStart?.message} highlighted={highlight("registrationStart")}>
          <Input type="date" {...register("registrationStart")} />
        </Field>

        <Field label="접수 마감" required note={aiFieldNotes?.registrationEnd} error={errors.registrationEnd?.message} highlighted={highlight("registrationEnd")}>
          <Input type="date" {...register("registrationEnd")} />
        </Field>

        <Field label="장소" required note={aiFieldNotes?.venue} error={errors.venue?.message} highlighted={highlight("venue")}>
          <Input {...register("venue")} />
        </Field>

        <Field
          label="부문"
          note={aiFieldNotes?.sections}
          hint="쉼표로 구분"
          error={errors.sectionsCsv?.message}
          highlighted={highlight("sectionsCsv")}
        >
          <Input
            {...register("sectionsCsv")}
            placeholder="주니어 클래식, 시니어 클래식"
          />
        </Field>

        <Field
          label="참가 대상"
          note={aiFieldNotes?.ageGroups}
          hint="쉼표로 구분"
          error={errors.ageGroupsCsv?.message}
          highlighted={highlight("ageGroupsCsv")}
        >
          <Input
            {...register("ageGroupsCsv")}
            placeholder="만 9-13세, 만 14-17세"
          />
        </Field>

        <Field label="참가비" note={aiFieldNotes?.fee} error={errors.fee?.message} highlighted={highlight("fee")}>
          <Input {...register("fee")} placeholder="부문당 ₩150,000" />
        </Field>

        <Field
          label="시상"
          note={aiFieldNotes?.awards}
          error={errors.awards?.message}
          className="md:col-span-2"
          highlighted={highlight("awards")}
        >
          <Input {...register("awards")} />
        </Field>

        <Field
          label="공식 URL"
          required
          note={aiFieldNotes?.officialUrl}
          error={errors.officialUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("officialUrl")}
        >
          <Input type="url" {...register("officialUrl")} />
        </Field>

        <Field
          label="접수 URL"
          note={aiFieldNotes?.registerUrl}
          error={errors.registerUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("registerUrl")}
        >
          <Input type="url" {...register("registerUrl")} />
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
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] text-warm-gray",
        )}
      >
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
