"use client";

import Image from "next/image";
import { useState } from "react";
import { RotateCw, ZoomIn, ZoomOut, Sparkles } from "lucide-react";
import {
  CATEGORY_GRADIENTS,
  CATEGORY_LABELS,
  type Competition,
} from "@/lib/types/competition";
import { cn } from "@/lib/cn";

type Props = {
  competition: Competition;
};

export function SourcePane({ competition: c }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);

  const [gFrom, gTo] = CATEGORY_GRADIENTS[c.category];

  return (
    <aside className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 min-h-[480px]">
      <header className="flex items-center justify-between">
        <div className="text-sm font-medium text-ink">📷 원본 포스터</div>
        {c.officialUrl ? (
          <a
            href={c.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand hover:underline"
          >
            원문 URL 열기 ↗
          </a>
        ) : null}
      </header>

      <div className="flex-1 relative overflow-hidden rounded-sm border border-border bg-cream-start/30">
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform"
          style={{ transform: `scale(${zoom}) rotate(${rotate}deg)` }}
        >
          {c.posterUrl ? (
            <Image
              src={c.posterUrl}
              alt={`${c.name} 포스터`}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-contain"
            />
          ) : (
            <div
              className="size-full flex items-center justify-center font-serif text-white text-sm"
              style={{
                background: `linear-gradient(135deg, ${gFrom} 0%, ${gTo} 100%)`,
              }}
            >
              <div className="text-center">
                <div>{CATEGORY_LABELS[c.category]}</div>
                <div className="mt-1 text-[11px] opacity-70">
                  포스터 없음
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex items-center gap-2">
        <IconBtn
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          label="축소"
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="size-4" />
        </IconBtn>
        <span className="text-[11px] text-warm-gray w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <IconBtn
          onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
          label="확대"
          disabled={zoom >= 2.5}
        >
          <ZoomIn className="size-4" />
        </IconBtn>
        <IconBtn
          onClick={() => setRotate((r) => (r + 90) % 360)}
          label="회전"
        >
          <RotateCw className="size-4" />
        </IconBtn>
        <div className="flex-1" />
        <IconBtn label="AI 재추출 (T6에서 활성화)" disabled>
          <Sparkles className="size-4" />
          <span className="ml-1 text-[11px]">AI 재추출</span>
        </IconBtn>
      </footer>
    </aside>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-sm text-warm-gray hover:text-ink hover:bg-cream-start/60 transition-colors",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
