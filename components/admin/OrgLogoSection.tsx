"use client";

import { useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  Camera,
  Download,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { db, functions, storage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
  orgId: string;
  orgName: string;
  currentLogoUrl?: string;
  candidates: string[]; // AI-suggested URLs (logoCandidates field)
  onLogoUpdated: (newUrl: string | null) => void;
};

type DownloadLogoResponse = { logoUrl: string; sourceUrl: string };

// Render the logo block of the org editor:
//   - current logo (or placeholder) with "remove" button
//   - AI candidate thumbnails (click to download → Storage → save URL)
//   - manual file upload fallback
//
// All writes go through the editor's Firebase Auth session, gated by
// firestore.rules (organizations: editor required) and storage.rules
// (organizations/{id}/*: authenticated + image + 2MB).
export function OrgLogoSection({
  orgId,
  orgName,
  currentLogoUrl,
  candidates,
  onLogoUpdated,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function applyLogoUrl(newUrl: string | null, sourceUrl?: string) {
    await updateDoc(doc(db, "organizations", orgId), {
      logoUrl: newUrl ?? null,
      logoSourceUrl: sourceUrl ?? (newUrl ? "manual-upload" : null),
      lastUpdatedAt: serverTimestamp(),
    });
    onLogoUpdated(newUrl);
  }

  async function handleCandidateClick(url: string) {
    setError(null);
    setBusy(`candidate:${url}`);
    try {
      const callable = httpsCallable<
        { orgId: string; sourceUrl: string },
        DownloadLogoResponse
      >(functions, "downloadOrgLogo");
      const res = await callable({ orgId, sourceUrl: url });
      await applyLogoUrl(res.data.logoUrl, res.data.sourceUrl);
    } catch (err) {
      console.error("[OrgLogoSection] candidate download failed:", err);
      setError(
        err instanceof Error ? err.message : "로고 다운로드에 실패했어요",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleManualUpload(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 가능해요");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("2MB 이하만 가능해요");
      return;
    }
    setBusy("upload");
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `organizations/${orgId}/logo-${Date.now()}.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);
      await applyLogoUrl(url, "manual-upload");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("[OrgLogoSection] manual upload failed:", err);
      setError(
        err instanceof Error ? err.message : "업로드에 실패했어요",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (!currentLogoUrl) return;
    setError(null);
    setBusy("remove");
    try {
      await applyLogoUrl(null);
    } catch (err) {
      console.error("[OrgLogoSection] remove failed:", err);
      setError("삭제에 실패했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-border rounded-md p-3 bg-cream-start/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          로고
        </div>
        {currentLogoUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 text-[11px] text-warm-gray hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {busy === "remove" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            제거
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-white shrink-0">
          {currentLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogoUrl}
              alt={`${orgName} 로고`}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
              <Camera className="size-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm text-ink truncate">{orgName}</div>
          <div className="text-[11px] text-warm-gray">
            {currentLogoUrl
              ? "로고가 등록되어 있어요 — 후보 클릭 또는 업로드로 교체할 수 있어요"
              : "후보를 클릭하거나 직접 업로드해 주세요"}
          </div>
        </div>
      </div>

      {/* AI candidates */}
      {candidates.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] text-warm-gray">
            AI가 찾은 후보 {candidates.length}개 — 클릭하면 다운로드해서 적용해요
          </div>
          <div className="flex gap-2 flex-wrap">
            {candidates.slice(0, 3).map((url) => {
              const active = busy === `candidate:${url}`;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => handleCandidateClick(url)}
                  disabled={busy !== null}
                  className={cn(
                    "relative w-14 h-14 rounded-sm border border-border bg-white overflow-hidden",
                    "hover:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  title={url}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                    onError={(e) => {
                      // Broken candidate — fade it visually so the editor knows.
                      e.currentTarget.style.opacity = "0.2";
                    }}
                  />
                  {active ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="size-4 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] py-0.5 text-center">
                      <Download className="size-3 inline" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Manual upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleManualUpload(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
          className="w-full"
        >
          {busy === "upload" ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              업로드 중…
            </>
          ) : (
            <>
              <Upload className="size-3.5 mr-1.5" />
              직접 업로드 (PNG / SVG / JPG · 2MB 이하)
            </>
          )}
        </Button>
      </div>

      {error ? (
        <div className="rounded-sm bg-red-50 text-red-700 text-[11px] px-2 py-1.5">
          {error}
        </div>
      ) : null}
    </div>
  );
}
