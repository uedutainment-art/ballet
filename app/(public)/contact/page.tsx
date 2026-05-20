"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { httpsCallable, type FunctionsError } from "firebase/functions";
import { AlertTriangle, Check, Loader2, Paperclip, X } from "lucide-react";
import { functions } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  INQUIRY_TYPE_HINTS,
  INQUIRY_TYPE_LABELS,
  INQUIRY_TYPE_ORDER,
  type InquiryType,
} from "@/lib/types/inquiry";
import {
  inquiryFormSchema,
  type InquiryFormValues,
} from "@/lib/zod/inquiry";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

type SubmitResponse = { inquiryId: string };

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      type: "NEW_CONTENT",
      subject: "",
      message: "",
      email: "",
      agreed: false,
    },
    mode: "onSubmit",
  });

  const selectedType = watch("type");
  const hint = INQUIRY_TYPE_HINTS[selectedType as InquiryType];

  function pickAttachment(file: File | null) {
    setAttachmentError(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError("10MB 이하 파일만 가능해요");
      return;
    }
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setAttachmentError("이미지 또는 PDF만 첨부 가능해요");
      return;
    }
    setAttachment(file);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = r.result;
        if (typeof result !== "string") {
          reject(new Error("read failed"));
          return;
        }
        // Strip "data:...;base64," prefix.
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      r.onerror = () => reject(r.error ?? new Error("read failed"));
      r.readAsDataURL(file);
    });
  }

  async function onSubmit(values: InquiryFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const callable = httpsCallable<Record<string, unknown>, SubmitResponse>(
        functions,
        "submitInquiry",
      );
      const payload: Record<string, unknown> = {
        type: values.type,
        subject: values.subject,
        message: values.message,
        email: values.email || undefined,
      };
      if (attachment) {
        payload.attachmentBase64 = await fileToBase64(attachment);
        payload.attachmentFileName = attachment.name;
        payload.attachmentContentType = attachment.type;
        payload.attachmentSizeBytes = attachment.size;
      }
      const res = await callable(payload);
      setSubmitted(res.data.inquiryId);
      reset();
      setAttachment(null);
    } catch (err) {
      // FunctionsError typically arrives with code + message; surface message
      // directly so users see Korean strings (function emits Korean).
      const fe = err as FunctionsError;
      if (fe?.code === "functions/unavailable") {
        setError(
          "제보 시스템이 아직 활성화되지 않았어요. 잠시 후 다시 시도해 주세요.",
        );
      } else {
        setError(
          fe?.message ??
            (err instanceof Error ? err.message : "제출에 실패했어요"),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <SuccessScreen inquiryId={submitted} onClose={() => setSubmitted(null)} />;
  }

  return (
    <article className="px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-3">
            CONTACT
          </div>
          <h1 className="text-3xl font-serif font-medium text-ink leading-tight">
            정보 제보 · 수정 · 문의
          </h1>
          <p className="mt-4 text-sm text-warm-gray leading-relaxed">
            K BALLET은 정확한 정보를 위해 관계자 분들의 제보를 환영합니다.
            <br />
            보통 1~3일 내 검토 후 안내드립니다.
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-10 bg-white border border-border rounded-md p-6 space-y-5"
        >
          <Field
            label="유형"
            required
            error={errors.type?.message}
          >
            <Select {...register("type")}>
              {INQUIRY_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {INQUIRY_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
            {hint ? (
              <div className="mt-1.5 text-[11px] text-warm-gray">
                💡 {hint}
              </div>
            ) : null}
          </Field>

          <Field label="제목" required error={errors.subject?.message}>
            <Input
              {...register("subject")}
              placeholder="제보 내용을 한 줄로 요약해 주세요"
            />
          </Field>

          <Field label="내용" required error={errors.message?.message}>
            <Textarea
              rows={8}
              {...register("message")}
              placeholder="자세한 내용을 적어주세요 (10자 이상, 3000자 이하)"
            />
          </Field>

          <Field
            label="답신 받을 이메일"
            hint="비워두면 처리 결과를 안내드릴 수 없어요"
            error={errors.email?.message}
          >
            <Input
              type="email"
              {...register("email")}
              placeholder="you@example.com"
            />
          </Field>

          <Field
            label="첨부 (포스터·PDF, 10MB 이하)"
            error={attachmentError ?? undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => pickAttachment(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {attachment ? (
              <div className="flex items-center gap-2 border border-border rounded-sm px-3 py-2 bg-cream-start/30">
                <Paperclip className="size-3.5 text-warm-gray shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ink truncate" title={attachment.name}>
                    {attachment.name}
                  </div>
                  <div className="text-[10px] text-warm-gray">
                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-warm-gray hover:text-red-600"
                  aria-label="첨부 제거"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Paperclip className="size-3.5 mr-1.5" />
                파일 선택
              </Button>
            )}
          </Field>

          <label className="flex items-start gap-2 text-xs text-warm-gray cursor-pointer">
            <input
              type="checkbox"
              {...register("agreed")}
              className="mt-0.5 accent-brand"
            />
            <span className="leading-relaxed">
              제보 내용 · 이메일 · IP 해시는 제보 처리 목적으로만 사용되며,
              처리 완료 후 12개월 보관 후 삭제돼요.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.agreed ? (
            <div className="-mt-3 text-[11px] text-red-600">
              {errors.agreed.message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-sm bg-red-50 text-red-700 text-xs px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                전송 중…
              </>
            ) : (
              "제출"
            )}
          </Button>
        </form>

        <footer className="mt-8 text-[11px] text-warm-gray/80 leading-relaxed text-center">
          허위 정보·스팸 제보 시 등록이 거부될 수 있어요. K BALLET에 표시된 각
          기관의 자료에 대한 저작권은 해당 기관에 있습니다.
          <br />
          시스템 외 직접 문의는{" "}
          <a
            href="mailto:uedutainment@gmail.com"
            className="text-brand hover:underline"
          >
            uedutainment@gmail.com
          </a>
          으로도 가능해요.
        </footer>
      </div>
    </article>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-warm-gray">
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
        {hint ? (
          <span className="text-[10px] text-warm-gray/70">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="mt-1 text-[11px] text-red-600">{error}</div>
      ) : null}
    </div>
  );
}

function SuccessScreen({
  inquiryId,
  onClose,
}: {
  inquiryId: string;
  onClose: () => void;
}) {
  // Avoid SSR mismatch on the truncated id.
  const [shortId, setShortId] = useState<string>("");
  useEffect(() => {
    setShortId(inquiryId.slice(0, 8));
  }, [inquiryId]);

  return (
    <article className="px-6 py-24">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <Check className="size-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-serif font-medium text-ink">
          제보가 접수됐어요
        </h1>
        <p className="mt-4 text-sm text-warm-gray leading-relaxed">
          이메일을 남기셨다면 곧 접수 확인 메일이 도착해요.
          <br />
          보통 1~3일 내 검토 후 다시 안내드릴게요.
        </p>
        <div className="mt-6 inline-block text-[11px] tracking-wider text-warm-gray/70 uppercase">
          접수번호: <span className="font-mono">{shortId || "…"}</span>
        </div>
        <div className="mt-8">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            한 번 더 제보하기
          </Button>
        </div>
      </div>
    </article>
  );
}
