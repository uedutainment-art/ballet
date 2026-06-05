"use client";

import { useRef, useState } from "react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { db, storage } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

type Collection = "competitions" | "performances";

type Props = {
  collection: Collection;
  docId: string;
  currentPosterUrl?: string;
  onPosterUpdated: (newUrl: string | null) => void;
};

// Drop-in poster picker used by the Competition and Performance editors.
// Mirrors OrgLogoSection but tuned for 2:3 posters (taller preview, 5MB cap,
// no AI candidates). Upload writes to
// `posters/{collection}/{docId}/poster-{timestamp}.{ext}` so older versions
// stay in Storage for rollback while the doc always points at the latest URL.
export function PosterUploadSection({
  collection,
  docId,
  currentPosterUrl,
  onPosterUpdated,
}: Props) {
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function applyPosterUrl(newUrl: string | null) {
    await updateDoc(doc(db, collection, docId), {
      posterUrl: newUrl ?? null,
      lastUpdatedAt: serverTimestamp(),
    });
    onPosterUpdated(newUrl);
  }

  async function handleUpload(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 가능해요");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("5MB 이하만 가능해요");
      return;
    }
    setBusy("upload");
    try {
      const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ext = /^[a-z0-9]+$/.test(rawExt) ? rawExt : "jpg";
      const path = `posters/${collection}/${docId}/poster-${Date.now()}.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);
      await applyPosterUrl(url);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("[PosterUploadSection] upload failed:", err);
      setError(err instanceof Error ? err.message : "업로드에 실패했어요");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (!currentPosterUrl) return;
    setError(null);
    setBusy("remove");
    try {
      await applyPosterUrl(null);
    } catch (err) {
      console.error("[PosterUploadSection] remove failed:", err);
      setError("삭제에 실패했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-border rounded-md p-3 bg-cream-start/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-wider text-warm-gray uppercase">
          포스터
        </div>
        {currentPosterUrl ? (
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

      <div className="flex items-start gap-3">
        {/* 2:3 preview — matches the card + detail hero ratio so the operator
            sees the actual crop, not a placeholder square. */}
        <div className="relative w-20 h-28 rounded-md overflow-hidden border border-border bg-white shrink-0">
          {currentPosterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPosterUrl}
              alt="현재 포스터"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-warm-gray">
              <Camera className="size-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-[11px] text-warm-gray">
            {currentPosterUrl
              ? "포스터가 등록되어 있어요 — 새 파일을 올리면 교체돼요"
              : "포스터 이미지를 선택하면 카드와 상세 페이지에 노출돼요"}
          </div>
          <div className="text-[10px] text-warm-gray/80">
            세로(2:3) 포스터 권장 · JPG / PNG / WEBP · 5MB 이하
          </div>
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
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
              {currentPosterUrl ? "포스터 교체" : "포스터 업로드"}
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
