"use client";

import {useEffect, useRef, useState} from "react";
import Image from "next/image";
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import {Button} from "@/components/ui/Button";
import {Input, Textarea} from "@/components/ui/Input";
import {fileToDataUrl, pdfFirstPageToPng} from "@/lib/admin/pdfToImage";
import {
  APPLY_MODES,
  applyModeHint,
  applyModeLabel,
  callReExtract,
  type ApplyMode,
  type InputMode,
  type ReExtractDomain,
  type ReExtractResponse,
} from "@/lib/admin/reExtract";
import {cn} from "@/lib/cn";

export type SourcePaneTarget = {
  id: string;
  domain: ReExtractDomain;
  posterUrl?: string;
  officialUrl?: string;
  // Optional YouTube ID — when present the left-side reference shows the
  // embedded player instead of a poster thumbnail. Used by /admin/videos.
  youtubeId?: string;
  // Optional logo URL — used by /admin/organizations to render the current
  // logo as the "current reference" thumbnail.
  logoUrl?: string;
  // Optional title shown next to the reference thumbnail (org name etc.).
  primaryLabel?: string;
  accentColorFrom: string; // for fallback gradient
  accentColorTo: string;
  accentLabel: string;
};

type Props = {
  target: SourcePaneTarget;
  onReExtracted: (response: ReExtractResponse) => void;
};

const TABS: Array<{key: InputMode; label: string; icon: typeof ImageIcon}> = [
  {key: "image", label: "이미지", icon: ImageIcon},
  {key: "pdf", label: "PDF", icon: FileText},
  {key: "url", label: "URL", icon: Link2},
  {key: "text", label: "텍스트", icon: Type},
];

const MAX_BYTES = 10 * 1024 * 1024;

export function SourcePane({target, onReExtracted}: Props) {
  const [tab, setTab] = useState<InputMode>("image");
  const [applyMode, setApplyMode] = useState<ApplyMode>("fill_empty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Per-tab state (kept independent so switching tabs doesn't lose input).
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreviewUrl, setImgPreviewUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");

  // Build object URLs for in-pane previews. Cleanup on change/unmount.
  useEffect(() => {
    if (!imgFile) {
      setImgPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(imgFile);
    setImgPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imgFile]);

  // PDF first-page render to a preview image whenever a new PDF is selected.
  useEffect(() => {
    if (!pdfFile) {
      setPdfPreviewUrl(null);
      return;
    }
    let revoke: string | null = null;
    (async () => {
      try {
        const blob = await pdfFirstPageToPng(pdfFile);
        const u = URL.createObjectURL(blob);
        revoke = u;
        setPdfPreviewUrl(u);
      } catch (err) {
        setError(
          "PDF 미리보기 생성 실패: " +
            (err instanceof Error ? err.message : String(err)),
        );
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [pdfFile]);

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  async function onAnalyze() {
    clearMessages();
    setBusy(true);
    try {
      const payload: {dataUrl?: string; url?: string; text?: string} = {};
      switch (tab) {
        case "image": {
          if (!imgFile) {
            setError("이미지 파일을 선택해 주세요");
            return;
          }
          payload.dataUrl = await fileToDataUrl(imgFile);
          break;
        }
        case "pdf": {
          if (!pdfFile) {
            setError("PDF 파일을 선택해 주세요");
            return;
          }
          const png = await pdfFirstPageToPng(pdfFile);
          payload.dataUrl = await fileToDataUrl(png);
          break;
        }
        case "url": {
          const v = urlValue.trim();
          if (!/^https?:\/\//i.test(v)) {
            setError("URL은 http:// 또는 https://로 시작해야 해요");
            return;
          }
          payload.url = v;
          break;
        }
        case "text": {
          const t = textValue.trim();
          if (t.length < 20) {
            setError("텍스트가 너무 짧아요 (20자 이상)");
            return;
          }
          payload.text = t;
          break;
        }
      }

      const res = await callReExtract({
        docId: target.id,
        domain: target.domain,
        mode: tab,
        applyMode,
        payload,
      });

      onReExtracted(res);

      if (res.fieldsUpdated.length === 0) {
        setInfo(
          `갱신된 필드 없음 — 추출 결과가 기존 데이터와 같거나 빈 필드가 없었어요 (신뢰도 ${Math.round(
            res.confidence * 100,
          )}%)`,
        );
      } else {
        setInfo(
          `${res.fieldsUpdated.length}개 필드 갱신됨 (신뢰도 ${Math.round(
            res.confidence * 100,
          )}%)`,
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "AI 분석에 실패했어요";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="bg-white border border-border rounded-md p-4 flex flex-col gap-4">
      {/* Existing source reference */}
      <OriginalSource target={target} />

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-border overflow-x-auto -mx-1 px-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                clearMessages();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "border-brand text-ink"
                  : "border-transparent text-warm-gray hover:text-ink",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="min-h-[140px]">
        {tab === "image" ? (
          <FilePicker
            file={imgFile}
            previewUrl={imgPreviewUrl}
            accept="image/*"
            onChange={(f) => {
              clearMessages();
              if (f && !f.type.startsWith("image/")) {
                setError("이미지 파일만 가능해요");
                return;
              }
              if (f && f.size > MAX_BYTES) {
                setError("10MB 이하 파일만 가능해요");
                return;
              }
              setImgFile(f);
            }}
            hint="JPG · PNG · WEBP · 10MB 이하"
          />
        ) : tab === "pdf" ? (
          <FilePicker
            file={pdfFile}
            previewUrl={pdfPreviewUrl}
            accept="application/pdf"
            onChange={(f) => {
              clearMessages();
              if (f && f.type !== "application/pdf") {
                setError("PDF만 가능해요");
                return;
              }
              if (f && f.size > MAX_BYTES) {
                setError("10MB 이하 파일만 가능해요");
                return;
              }
              setPdfFile(f);
            }}
            hint="첫 페이지를 이미지로 변환해 분석합니다 · 10MB 이하"
          />
        ) : tab === "url" ? (
          <div className="space-y-2">
            <Input
              type="url"
              placeholder={
                target.domain === "organization"
                  ? "https://example.org (기관 공식 사이트)"
                  : "https://example.com/contest"
              }
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
            />
            <p className="text-[11px] text-warm-gray">
              {target.domain === "organization"
                ? "기관 공식 홈페이지 URL을 붙여넣으면 이름·주소·연락처·로고 후보를 추출해요."
                : "공식 페이지 또는 모집요강 URL을 붙여넣으세요. HTML만 지원 (PDF 링크는 PDF 탭에서 직접 업로드해 주세요)."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={6}
              placeholder="모집요강 본문 · 페이지 캡션 · SNS 글 등을 그대로 붙여넣으세요"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
            />
            <div className="flex items-center justify-between text-[11px] text-warm-gray">
              <span>최소 20자</span>
              <span>{textValue.length.toLocaleString()}자</span>
            </div>
          </div>
        )}
      </div>

      {/* Apply mode radio */}
      <fieldset className="border-t border-border pt-3 space-y-2">
        <legend className="text-xs text-warm-gray mb-1">
          AI 분석 결과를 어떻게 적용할까요?
        </legend>
        {APPLY_MODES.map((m) => (
          <label
            key={m}
            className="flex items-start gap-2 text-xs cursor-pointer"
          >
            <input
              type="radio"
              name="applyMode"
              value={m}
              checked={applyMode === m}
              onChange={() => setApplyMode(m)}
              className="mt-0.5 accent-brand"
            />
            <span>
              <span className="text-ink">
                {applyModeLabel(m)}
                {m === "fill_empty" ? (
                  <span className="ml-1 text-[10px] text-brand">권장</span>
                ) : null}
              </span>
              <span className="block text-[11px] text-warm-gray">
                {applyModeHint(m)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Action */}
      <div className="pt-2 space-y-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onAnalyze}
          disabled={busy}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              AI 분석 중… 약 5~15초
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              AI 분석 시작
            </>
          )}
        </Button>
        {error ? (
          <div className="rounded-sm bg-red-50 text-red-700 text-xs px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {info ? (
          <div className="rounded-sm bg-green-50 text-green-700 text-xs px-3 py-2">
            {info}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function OriginalSource({target}: {target: SourcePaneTarget}) {
  // Video domain: render the YouTube embed inline so the editor can preview
  // the actual video they're cataloguing without leaving the page.
  if (target.domain === "video" && target.youtubeId) {
    return (
      <div className="space-y-2 pb-3 border-b border-border">
        <div className="text-xs text-warm-gray">📺 현재 영상</div>
        <div className="relative aspect-video bg-black rounded-sm overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${target.youtubeId}?rel=0&modestbranding=1`}
            title="현재 영상"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="text-[10px] text-warm-gray text-right">
          다른 자료로 재분석 ↓
        </div>
      </div>
    );
  }

  // Organizations show their logo (or a placeholder) as the current reference.
  if (target.domain === "organization") {
    const hasLogo = !!target.logoUrl;
    return (
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="relative w-14 h-14 rounded-md overflow-hidden border border-border bg-white shrink-0">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.logoUrl!}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${target.accentColorFrom} 0%, ${target.accentColorTo} 100%)`,
              }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-warm-gray">🏛 현재 기관</div>
          <div className="text-[11px] text-ink mt-0.5 truncate">
            {target.primaryLabel ?? "이름 미설정"}
          </div>
          <div className="text-[10px] text-warm-gray/70 mt-0.5">
            {hasLogo ? "로고 있음" : "로고 없음"} · {target.accentLabel}
          </div>
        </div>
        <span className="text-[10px] text-warm-gray text-right shrink-0">
          공식 사이트 URL로
          <br />
          AI 추출 ↓
        </span>
      </div>
    );
  }

  const hasPoster = !!target.posterUrl;
  const sourceLabel =
    target.domain === "competition" ? "📷 현재 원본 자료" : "📌 현재 기준 자료";
  const sourceDetail =
    target.domain === "competition" ?
      hasPoster ? "포스터 이미지 있음" : "포스터 없음" :
      target.domain === "video" ?
        "YouTube ID 없음" :
        "포스터 없음";

  return (
    <div className="flex items-center gap-3 pb-2 border-b border-border">
      <div className="relative w-12 h-16 rounded-sm overflow-hidden border border-border bg-cream-start/40 shrink-0">
        {hasPoster ? (
          <Image
            src={target.posterUrl!}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${target.accentColorFrom} 0%, ${target.accentColorTo} 100%)`,
            }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-warm-gray">{sourceLabel}</div>
        <div className="text-[11px] text-warm-gray/70 mt-0.5">
          {sourceDetail} · {target.accentLabel}
        </div>
      </div>
      <span className="text-[10px] text-warm-gray text-right shrink-0">
        다른 자료로
        <br />
        재분석 ↓
      </span>
    </div>
  );
}

function FilePicker({
  file,
  previewUrl,
  accept,
  onChange,
  hint,
}: {
  file: File | null;
  previewUrl: string | null;
  accept: string;
  onChange: (f: File | null) => void;
  hint: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <label
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0] ?? null;
        onChange(f);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      className={cn(
        "block border-2 border-dashed rounded-md px-4 py-6 text-center cursor-pointer transition-colors",
        dragOver
          ? "border-brand bg-brand/5"
          : file
            ? "border-green-300 bg-green-50/40"
            : "border-border bg-cream-start/30 hover:border-warm-gray",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {file ? (
        <div className="space-y-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={file.name}
              className="mx-auto max-h-40 rounded-sm border border-border bg-white object-contain"
            />
          ) : (
            <Loader2 className="size-6 mx-auto text-warm-gray animate-spin" />
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
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="inline-flex items-center gap-1 text-[11px] text-warm-gray hover:text-ink"
          >
            <X className="size-3" />
            다른 파일 선택
          </button>
        </div>
      ) : (
        <div className="space-y-2 text-warm-gray">
          <Upload className="size-5 mx-auto" />
          <div className="text-xs">
            여기에 끌어다 놓거나{" "}
            <span className="text-brand underline underline-offset-2">
              클릭해서 선택
            </span>
          </div>
          <div className="text-[10px] text-warm-gray/70">{hint}</div>
        </div>
      )}
    </label>
  );
}
