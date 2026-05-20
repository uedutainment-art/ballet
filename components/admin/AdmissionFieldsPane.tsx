"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfidenceMeter } from "@/components/admin/ConfidenceMeter";
import { OrgLinkRow } from "@/components/admin/OrgLinkRow";
import {
  CSAT_LABELS,
  SCHOOL_TYPE_LABELS,
} from "@/lib/types/admission";
import type { AdmissionFormValues } from "@/lib/zod/admission";
import type { AutosaveStatus } from "@/lib/admin/useAutosave";
import { cn } from "@/lib/cn";

type Props = {
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  autosave: AutosaveStatus;
  recentlyUpdated?: ReadonlySet<string>;
};

const FIRESTORE_TO_FORM: Record<string, string> = {
  subjects: "subjectsCsv",
  bonusCompetitions: "bonusCompetitionsCsv",
};

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function AdmissionFieldsPane({
  aiConfidence,
  aiFieldNotes,
  autosave,
  recentlyUpdated,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<AdmissionFormValues>();

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
            ✏ 입시 정보 — 편집
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
        <Field label="학교명" required note={aiFieldNotes?.schoolName} error={errors.schoolName?.message} highlighted={highlight("schoolName")} className="md:col-span-2">
          <Input {...register("schoolName")} />
          <div className="mt-2">
            <OrgLinkRow<AdmissionFormValues>
              label="학교 기관 연결"
              nameField="schoolName"
              idField="schoolOrgId"
              typeFilter={["UNIVERSITY", "HIGH_SCHOOL", "MIDDLE_SCHOOL"]}
              createAsType="UNIVERSITY"
              hint="기관 DB 연결 시 학교 상세 페이지에 노출돼요"
            />
          </div>
        </Field>

        <Field label="학과" required note={aiFieldNotes?.department} error={errors.department?.message} highlighted={highlight("department")}>
          <Input {...register("department")} placeholder="예: 무용원 발레전공" />
        </Field>

        <Field label="학교 유형" required note={aiFieldNotes?.schoolType} error={errors.schoolType?.message} highlighted={highlight("schoolType")}>
          <Select {...register("schoolType")}>
            {(Object.keys(SCHOOL_TYPE_LABELS) as Array<keyof typeof SCHOOL_TYPE_LABELS>).map((k) => (
              <option key={k} value={k}>
                {SCHOOL_TYPE_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="학년도" required note={aiFieldNotes?.year} error={errors.year?.message} highlighted={highlight("year")}>
          <Input
            type="number"
            min={2024}
            max={2099}
            {...register("year", { valueAsNumber: true })}
            placeholder="2027"
          />
        </Field>

        <Field label="모집인원" hint="명 단위 숫자" note={aiFieldNotes?.capacity} error={errors.capacity?.message} highlighted={highlight("capacity")}>
          <Input
            type="number"
            min={0}
            {...register("capacity", { valueAsNumber: true })}
            placeholder="예: 15"
          />
        </Field>

        <Field label="전형료" note={aiFieldNotes?.fee} error={errors.fee?.message} highlighted={highlight("fee")}>
          <Input {...register("fee")} placeholder="예: ₩90,000" />
        </Field>

        <Field label="원서 접수 시작" note={aiFieldNotes?.regStart} error={errors.regStart?.message} highlighted={highlight("regStart")}>
          <Input type="date" {...register("regStart")} />
        </Field>

        <Field label="원서 접수 마감" note={aiFieldNotes?.regEnd} error={errors.regEnd?.message} highlighted={highlight("regEnd")}>
          <Input type="date" {...register("regEnd")} />
        </Field>

        <Field label="1차 실기" note={aiFieldNotes?.practical1} error={errors.practical1?.message} highlighted={highlight("practical1")}>
          <Input type="date" {...register("practical1")} />
        </Field>

        <Field label="2차 실기" note={aiFieldNotes?.practical2} error={errors.practical2?.message} highlighted={highlight("practical2")}>
          <Input type="date" {...register("practical2")} />
        </Field>

        <Field label="발표일" note={aiFieldNotes?.announcementAt} error={errors.announcementAt?.message} highlighted={highlight("announcementAt")}>
          <Input type="date" {...register("announcementAt")} />
        </Field>

        <Field label="수능 반영" required note={aiFieldNotes?.csat} error={errors.csat?.message} highlighted={highlight("csat")}>
          <Select {...register("csat")}>
            {(Object.keys(CSAT_LABELS) as Array<keyof typeof CSAT_LABELS>).map((k) => (
              <option key={k} value={k}>
                {CSAT_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="실기과목"
          hint="쉼표로 구분"
          note={aiFieldNotes?.subjects}
          error={errors.subjectsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("subjectsCsv")}
        >
          <Input
            {...register("subjectsCsv")}
            placeholder="바리에이션, 컨템포러리 즉흥"
          />
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
          label="모집요강 URL"
          hint="PDF 링크 가능"
          note={aiFieldNotes?.guidelineUrl}
          error={errors.guidelineUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("guidelineUrl")}
        >
          <Input type="url" {...register("guidelineUrl")} />
        </Field>

        <Field
          label="가산점 콩쿠르"
          hint="콩쿠르 doc ID를 쉼표로 구분"
          note={aiFieldNotes?.bonusCompetitions}
          error={errors.bonusCompetitionsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("bonusCompetitionsCsv")}
        >
          <Input
            {...register("bonusCompetitionsCsv")}
            placeholder="예: kibc-2026, ygp-korea-2026"
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
