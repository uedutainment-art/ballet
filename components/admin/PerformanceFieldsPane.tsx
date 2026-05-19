"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfidenceMeter } from "@/components/admin/ConfidenceMeter";
import { COMPANY_TYPE_LABELS } from "@/lib/types/performance";
import type { PerformanceFormValues } from "@/lib/zod/performance";
import type { AutosaveStatus } from "@/lib/admin/useAutosave";
import { cn } from "@/lib/cn";

type Props = {
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  autosave: AutosaveStatus;
  recentlyUpdated?: ReadonlySet<string>;
};

const FIRESTORE_TO_FORM: Record<string, string> = {
  showtimes: "showtimesCsv",
};

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function PerformanceFieldsPane({
  aiConfidence,
  aiFieldNotes,
  autosave,
  recentlyUpdated,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<PerformanceFormValues>();

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
            ✏ 공연 정보 — 편집
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
        <Field
          label="공연명"
          required
          note={aiFieldNotes?.title}
          error={errors.title?.message}
          className="md:col-span-2"
          highlighted={highlight("title")}
        >
          <Input {...register("title")} />
        </Field>

        <Field label="단체" required note={aiFieldNotes?.company} error={errors.company?.message} highlighted={highlight("company")}>
          <Input {...register("company")} placeholder="예: 국립발레단" />
        </Field>

        <Field label="단체 유형" note={aiFieldNotes?.companyType} error={errors.companyType?.message} highlighted={highlight("companyType")}>
          <Select {...register("companyType")}>
            <option value="">선택 안 함</option>
            {(Object.keys(COMPANY_TYPE_LABELS) as Array<keyof typeof COMPANY_TYPE_LABELS>).map((k) => (
              <option key={k} value={k}>
                {COMPANY_TYPE_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="장소" required note={aiFieldNotes?.venue} error={errors.venue?.message} highlighted={highlight("venue")}>
          <Input {...register("venue")} placeholder="예: 예술의전당 오페라극장" />
        </Field>

        <Field label="러닝타임 (분)" note={aiFieldNotes?.runtime} error={errors.runtime?.message} highlighted={highlight("runtime")}>
          <Input
            type="number"
            min={0}
            {...register("runtime", { valueAsNumber: true })}
            placeholder="예: 120"
          />
        </Field>

        <Field label="시작일" required note={aiFieldNotes?.dateStart} error={errors.dateStart?.message} highlighted={highlight("dateStart")}>
          <Input type="date" {...register("dateStart")} />
        </Field>

        <Field label="종료일" required note={aiFieldNotes?.dateEnd} error={errors.dateEnd?.message} highlighted={highlight("dateEnd")}>
          <Input type="date" {...register("dateEnd")} />
        </Field>

        <Field
          label="회차"
          hint="쉼표로 구분"
          note={aiFieldNotes?.showtimes}
          error={errors.showtimesCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("showtimesCsv")}
        >
          <Input
            {...register("showtimesCsv")}
            placeholder="예: 7/1 19:00, 7/2 15:00, 7/2 19:00"
          />
        </Field>

        <Field
          label="티켓 최저가 (원)"
          note={aiFieldNotes?.ticketPriceMin}
          error={errors.ticketPriceMin?.message}
          highlighted={highlight("ticketPriceMin")}
        >
          <Input
            type="number"
            min={0}
            step={1000}
            {...register("ticketPriceMin", { valueAsNumber: true })}
            placeholder="예: 30000"
          />
        </Field>

        <Field
          label="티켓 최고가 (원)"
          note={aiFieldNotes?.ticketPriceMax}
          error={errors.ticketPriceMax?.message}
          highlighted={highlight("ticketPriceMax")}
        >
          <Input
            type="number"
            min={0}
            step={1000}
            {...register("ticketPriceMax", { valueAsNumber: true })}
            placeholder="예: 150000"
          />
        </Field>

        <Field label="안무" note={aiFieldNotes?.choreographer} error={errors.choreographer?.message} highlighted={highlight("choreographer")}>
          <Input {...register("choreographer")} />
        </Field>

        <Field label="음악" note={aiFieldNotes?.composer} error={errors.composer?.message} highlighted={highlight("composer")}>
          <Input {...register("composer")} />
        </Field>

        <Field label="관람연령" note={aiFieldNotes?.ageLimit} error={errors.ageLimit?.message} highlighted={highlight("ageLimit")}>
          <Input {...register("ageLimit")} placeholder="예: 8세 이상" />
        </Field>

        <Field
          label="포스터 URL"
          hint="공개 이미지 URL"
          note={aiFieldNotes?.posterUrl}
          error={errors.posterUrl?.message}
          highlighted={highlight("posterUrl")}
        >
          <Input type="url" {...register("posterUrl")} />
        </Field>

        <Field
          label="예매 URL"
          note={aiFieldNotes?.ticketUrl}
          error={errors.ticketUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("ticketUrl")}
        >
          <Input type="url" {...register("ticketUrl")} />
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
          label="공연 소개"
          hint="500자 이내"
          note={aiFieldNotes?.description}
          error={errors.description?.message}
          className="md:col-span-2"
          highlighted={highlight("description")}
        >
          <Textarea rows={4} {...register("description")} />
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
