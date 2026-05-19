"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Upload, X } from "lucide-react";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT_REGEX = /^(image\/.+|application\/pdf)$/;

const schema = z.object({
  title: z.string().optional(),
  link: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "URL은 http:// 또는 https://로 시작해야 해요",
    ),
  email: z.string().email("이메일 형식을 확인해 주세요"),
});

type FormData = z.infer<typeof schema>;

export default function SubmitPage() {
  return (
    <section className="px-6 py-12 min-h-screen bg-cream">
      <div className="mx-auto max-w-xl">
        <header className="text-center mb-6">
          <div className="text-xs tracking-[0.2em] text-warm-gray uppercase mb-2">
            K BALLET & CO.
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-medium text-ink">
            콩쿠르 제보
          </h1>
          <p className="mt-2 text-sm text-warm-gray">
            포스터 한 장만 올려주세요. AI가 1차 정리하고 운영자가 검토 후 공개합니다.
          </p>
        </header>

        <SubmitForm />

        <aside className="mt-6 bg-cream-start/60 border border-border rounded-md p-4 text-xs text-warm-gray leading-relaxed">
          <ul className="space-y-1">
            <li>· AI가 포스터 1장을 분석합니다 (JPG / PNG / PDF, 10 MB 이하)</li>
            <li>· 같은 행사의 추가 이미지는 한 번에 같이 올려도 됩니다</li>
            <li>· 다른 행사는 따로 제보해 주세요</li>
            <li>· 검토 후 24~48시간 내 공개에 반영됩니다</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function SubmitForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Build (and tear down) a blob URL for image previews.
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function acceptFile(f: File | null) {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError("파일 크기가 10 MB를 초과해요");
      setFile(null);
      return;
    }
    if (!ACCEPT_REGEX.test(f.type)) {
      setFileError("JPG / PNG / PDF만 올릴 수 있어요");
      setFile(null);
      return;
    }
    setFile(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(e.target.files?.[0] ?? null);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragOver(false);
    acceptFile(e.dataTransfer.files?.[0] ?? null);
  }

  function onDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data: FormData) {
    if (!file) {
      setFileError("포스터 파일을 선택해 주세요");
      return;
    }
    setPhase("uploading");
    setErrorMsg(null);
    try {
      const uuid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `submissions/anonymous/${uuid}/${safeName}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          submittedByEmail: data.email,
          title: data.title ?? "",
          link: data.link ?? "",
          submittedAt: new Date().toISOString(),
        },
      });
      setPhase("done");
      reset();
      setFile(null);
    } catch (err) {
      console.error("[submit] upload failed:", err);
      setPhase("error");
      setErrorMsg(
        err instanceof Error ? err.message : "업로드에 실패했어요",
      );
    }
  }

  if (phase === "done") {
    return (
      <Card className="p-8 text-center">
        <div className="text-base font-serif text-ink">제보가 접수됐어요</div>
        <p className="mt-2 text-xs text-warm-gray leading-relaxed">
          AI가 백그라운드에서 포스터를 분석합니다.
          <br />
          검토 후 공개에 반영되면 알려드릴게요.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="mt-5"
          onClick={() => setPhase("idle")}
        >
          하나 더 제보하기
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="대회명" hint="모르면 비워두셔도 OK">
          <Input
            {...register("title")}
            placeholder="예: KIBC 2026 한국국제발레콩쿠르"
          />
        </Field>

        <Field
          label="관련 링크"
          hint="공식 홈페이지·블로그·SNS 등 (선택)"
          error={errors.link?.message}
        >
          <Input
            type="url"
            {...register("link")}
            placeholder="https://..."
          />
        </Field>

        <Field
          label="연락처 이메일"
          required
          hint="처리 결과 안내용 — 외부 공개되지 않아요"
          error={errors.email?.message}
        >
          <Input
            type="email"
            {...register("email")}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="포스터 이미지"
          required
          hint="JPG / PNG / PDF · 10 MB 이하"
          error={fileError ?? undefined}
        >
          <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "block border-2 border-dashed rounded-md px-4 py-8 text-center cursor-pointer transition-colors",
              isDragOver
                ? "border-brand bg-brand/5"
                : file
                  ? "border-green-300 bg-green-50/40"
                  : "border-border bg-cream-start/30 hover:border-warm-gray hover:bg-cream-start/50",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={onFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="mx-auto max-h-48 rounded-sm border border-border bg-white object-contain"
                  />
                ) : (
                  <FileText className="size-10 mx-auto text-warm-gray" />
                )}
                <div className="text-xs text-ink truncate" title={file.name}>
                  ✓ {file.name}
                </div>
                <div className="text-[11px] text-warm-gray">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFile();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-warm-gray hover:text-ink"
                >
                  <X className="size-3" />
                  다른 파일 선택
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-warm-gray">
                <Upload className="size-6 mx-auto" />
                <div className="text-xs">
                  여기에 파일을 끌어다 놓거나{" "}
                  <span className="text-brand underline underline-offset-2">
                    클릭해서 선택
                  </span>
                </div>
                <div className="text-[10px] text-warm-gray/70">
                  JPG · PNG · PDF · 최대 10 MB
                </div>
              </div>
            )}
          </label>
        </Field>

        {errorMsg ? (
          <div className="rounded-sm bg-red-50 text-red-700 text-xs px-3 py-2">
            {errorMsg}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={phase === "uploading"}
        >
          {phase === "uploading" ? "업로드 중…" : "제보하기"}
        </Button>

        {phase === "uploading" ? (
          <p className="text-[11px] text-warm-gray text-center">
            업로드 완료 후 AI 분석은 백그라운드에서 진행됩니다.
          </p>
        ) : null}
      </form>
    </Card>
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
      <div className="flex items-baseline gap-2 mb-1">
        <label className="text-xs text-warm-gray">
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </label>
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

