"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfidenceMeter } from "@/components/admin/ConfidenceMeter";
import {
  ORG_REGIONS,
  ORG_TYPE_LABELS,
  ORG_TYPE_ORDER,
} from "@/lib/types/organization";
import type { OrganizationFormValues } from "@/lib/zod/organization";
import type { AutosaveStatus } from "@/lib/admin/useAutosave";
import { cn } from "@/lib/cn";

type Props = {
  aiConfidence?: number;
  aiFieldNotes?: Record<string, string>;
  autosave: AutosaveStatus;
  recentlyUpdated?: ReadonlySet<string>;
  logoSection?: React.ReactNode;
};

// Firestore field names (returned by AI re-extract) → form field names.
const FIRESTORE_TO_FORM: Record<string, string> = {
  aliases: "aliasesCsv",
  tags: "tagsCsv",
};

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function OrgFieldsPane({
  aiConfidence,
  aiFieldNotes,
  autosave,
  recentlyUpdated,
  logoSection,
}: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<OrganizationFormValues>();

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
            ✏ 기관 정보 — 편집
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

      {logoSection ? <div>{logoSection}</div> : null}

      {/* Identity */}
      <SectionTitle>기본 정보</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="이름"
          required
          note={aiFieldNotes?.name}
          error={errors.name?.message}
          className="md:col-span-2"
          highlighted={highlight("name")}
        >
          <Input {...register("name")} placeholder="정식 한국어명" />
        </Field>

        <Field
          label="약칭"
          hint="자주 쓰는 줄임말"
          note={aiFieldNotes?.shortName}
          error={errors.shortName?.message}
          highlighted={highlight("shortName")}
        >
          <Input {...register("shortName")} placeholder="예: 한예종" />
        </Field>

        <Field
          label="영문명"
          note={aiFieldNotes?.englishName}
          error={errors.englishName?.message}
          highlighted={highlight("englishName")}
        >
          <Input {...register("englishName")} />
        </Field>

        <Field
          label="별칭"
          hint="쉼표로 구분 — 검색에 사용"
          note={aiFieldNotes?.aliases}
          error={errors.aliasesCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("aliasesCsv")}
        >
          <Input
            {...register("aliasesCsv")}
            placeholder="예: 한예종, K-Arts, 한국예종"
          />
        </Field>
      </div>

      {/* Classification */}
      <SectionTitle>분류</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="유형"
          required
          note={aiFieldNotes?.type}
          error={errors.type?.message}
          highlighted={highlight("type")}
        >
          <Select {...register("type")}>
            {ORG_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="지역"
          note={aiFieldNotes?.region}
          error={errors.region?.message}
          highlighted={highlight("region")}
        >
          <Select {...register("region")}>
            <option value="">선택 안 함</option>
            {ORG_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="태그"
          hint="쉼표로 구분 — 국립, 사립, 예술고 등"
          note={aiFieldNotes?.tags}
          error={errors.tagsCsv?.message}
          className="md:col-span-2"
          highlighted={highlight("tagsCsv")}
        >
          <Input
            {...register("tagsCsv")}
            placeholder="예: 국립, 발레전공, 콩쿠르주관"
          />
        </Field>

        <Field
          label="공개 상태"
          required
          hint="비공개로 두면 어떤 페이지에도 노출되지 않아요"
        >
          <Select {...register("status")}>
            <option value="ACTIVE">공개 (ACTIVE)</option>
            <option value="INACTIVE">비공개 (INACTIVE)</option>
          </Select>
        </Field>
      </div>

      {/* Contact */}
      <SectionTitle>연락</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="공식 사이트"
          note={aiFieldNotes?.websiteUrl}
          error={errors.websiteUrl?.message}
          className="md:col-span-2"
          highlighted={highlight("websiteUrl")}
        >
          <Input
            type="url"
            {...register("websiteUrl")}
            placeholder="https://..."
          />
        </Field>

        <Field
          label="이메일"
          note={aiFieldNotes?.email}
          error={errors.email?.message}
          highlighted={highlight("email")}
        >
          <Input
            type="email"
            {...register("email")}
            placeholder="contact@..."
          />
        </Field>

        <Field
          label="전화"
          note={aiFieldNotes?.phone}
          error={errors.phone?.message}
          highlighted={highlight("phone")}
        >
          <Input {...register("phone")} placeholder="02-..." />
        </Field>

        <Field
          label="주소"
          note={aiFieldNotes?.address}
          error={errors.address?.message}
          className="md:col-span-2"
          highlighted={highlight("address")}
        >
          <Input {...register("address")} />
        </Field>
      </div>

      {/* Extras */}
      <SectionTitle>부가 정보</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="설립년도"
          note={aiFieldNotes?.establishedYear}
          error={errors.establishedYear?.message}
          highlighted={highlight("establishedYear")}
        >
          <Input
            type="number"
            min={1800}
            max={2099}
            {...register("establishedYear", { valueAsNumber: true })}
            placeholder="예: 1996"
          />
        </Field>

        <Field
          label="소개"
          hint="1~2문장"
          note={aiFieldNotes?.description}
          error={errors.description?.message}
          className="md:col-span-2"
          highlighted={highlight("description")}
        >
          <Textarea rows={3} {...register("description")} />
        </Field>

        <Field
          label="Instagram"
          highlighted={highlight("instagramUrl")}
        >
          <Input
            type="url"
            {...register("instagramUrl")}
            placeholder="https://instagram.com/..."
          />
        </Field>

        <Field
          label="YouTube"
          highlighted={highlight("youtubeUrl")}
        >
          <Input
            type="url"
            {...register("youtubeUrl")}
            placeholder="https://youtube.com/..."
          />
        </Field>

        <Field
          label="Facebook"
          highlighted={highlight("facebookUrl")}
          className="md:col-span-2"
        >
          <Input
            type="url"
            {...register("facebookUrl")}
            placeholder="https://facebook.com/..."
          />
        </Field>

        <Field
          label="비고"
          note={aiFieldNotes?.notes}
          error={errors.notes?.message}
          className="md:col-span-2"
        >
          <Textarea rows={3} {...register("notes")} />
        </Field>
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs tracking-wider text-warm-gray uppercase border-b border-border pb-1">
      {children}
    </div>
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
        highlighted
          ? "bg-green-50/80 ring-1 ring-green-300 -m-1 p-1"
          : "ring-0",
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
