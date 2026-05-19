"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getVideoById } from "@/lib/firebase/queries";
import { recordEdit } from "@/lib/firebase/editLogs";
import { useAuth } from "@/components/providers/AuthProvider";
import { VideoFieldsPane } from "@/components/admin/VideoFieldsPane";
import { SourcePane } from "@/components/admin/SourcePane";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionBar } from "@/components/admin/StatusTransitionBar";
import { useAutosave } from "@/lib/admin/useAutosave";
import { useShortcuts } from "@/lib/admin/useShortcuts";
import { videoFormSchema, type VideoFormValues } from "@/lib/zod/video";
import {
  transitionToArchived,
  transitionToHold,
  transitionToInReview,
  transitionToPublished,
  transitionToReady,
} from "@/lib/admin/transitions";
import { isAdminOrAbove } from "@/lib/types/user";
import {
  LEVEL_COLORS,
  LEVEL_LABELS,
  SERIES_LABELS,
  type Video,
  type VideoLevel,
} from "@/lib/types/video";
import {
  extractYoutubeId,
  getThumbnailUrl,
} from "@/lib/utils/youtube";
import type { ContentStatus } from "@/lib/types/status";

function videoToForm(v: Video): VideoFormValues {
  return {
    title: v.title ?? "",
    description: v.description ?? "",
    youtubeUrl: v.youtubeUrl ?? "",
    series: v.series,
    type: v.type,
    level: v.level,
    durationSeconds: v.durationSeconds,
    host: v.host ?? "",
    relatedCompetitionIdsCsv: (v.relatedCompetitionIds ?? []).join(", "),
    relatedAdmissionIdsCsv: (v.relatedAdmissionIds ?? []).join(", "),
    relatedPerformanceIdsCsv: (v.relatedPerformanceIds ?? []).join(", "),
    notes: v.notes ?? "",
  };
}

function formToPatch(v: VideoFormValues): Record<string, unknown> {
  const ytId = extractYoutubeId(v.youtubeUrl);
  const patch: Record<string, unknown> = {
    title: v.title,
    youtubeUrl: v.youtubeUrl,
    series: v.series,
    type: v.type,
    description: v.description ?? "",
    host: v.host ?? "",
    notes: v.notes ?? "",
    relatedCompetitionIds: (v.relatedCompetitionIdsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    relatedAdmissionIds: (v.relatedAdmissionIdsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    relatedPerformanceIds: (v.relatedPerformanceIdsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  // Always re-derive YouTube ID + thumbnail from the URL so they stay in sync.
  if (ytId) {
    patch.youtubeId = ytId;
    patch.thumbnailUrl = getThumbnailUrl(ytId);
  }
  if (v.level) patch.level = v.level;
  if (v.durationSeconds !== undefined && !Number.isNaN(v.durationSeconds)) {
    patch.durationSeconds = v.durationSeconds;
  }
  return patch;
}

function diffKeys(before: VideoFormValues, after: VideoFormValues): string[] {
  const keys = Object.keys(after) as Array<keyof VideoFormValues>;
  return keys.filter((k) => before[k] !== after[k]);
}

export default function VideoEditorPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user, userDoc } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const methods = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  const [lastSavedValues, setLastSavedValues] =
    useState<VideoFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getVideoById(params.id);
      if (cancelled) return;
      setVideo(v);
      if (v) {
        const formValues = videoToForm(v);
        methods.reset(formValues);
        setLastSavedValues(formValues);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const canPublish = isAdminOrAbove(userDoc?.role);
  const actor = useMemo(
    () => ({
      uid: user?.uid ?? "",
      displayName: userDoc?.displayName ?? user?.email ?? "운영자",
    }),
    [user?.uid, userDoc?.displayName, user?.email],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (!video) return;
    const ok = await methods.trigger();
    if (!ok) {
      showToast("필수 항목을 확인해 주세요");
      throw new Error("validation failed");
    }
    const values = methods.getValues();
    const patch = formToPatch(values);
    patch.lastUpdatedAt = serverTimestamp();
    await updateDoc(doc(db, "videos", video.id), patch);

    const changed = lastSavedValues ?
      diffKeys(lastSavedValues, values) :
      Object.keys(values);
    if (changed.length > 0 && user?.uid) {
      await recordEdit({
        docRef: `videos/${video.id}`,
        docType: "video",
        docTitle: values.title || video.title,
        userId: actor.uid,
        userDisplayName: actor.displayName,
        fromStatus: video.status,
        toStatus: video.status,
        changedFields: changed,
      });
    }

    setLastSavedValues(values);
    methods.reset(values, { keepDirty: false });
  }, [video, methods, lastSavedValues, actor, showToast, user?.uid]);

  const watched = methods.watch();
  const changeMarker = JSON.stringify(watched);
  const dirty = methods.formState.isDirty;

  const autosaveStatus = useAutosave({
    changeMarker,
    dirty,
    save: async () => {
      try {
        await save();
      } catch {
        // swallowed
      }
    },
  });

  const runTransition = useCallback(
    async (
      label: string,
      fn: (
        ctx: {
          id: string;
          docTitle: string;
          fromStatus: ContentStatus;
          collection: string;
          docType: "video";
        },
        actor: { uid: string; displayName: string },
      ) => Promise<void>,
    ) => {
      if (!video || !user?.uid) return;
      setBusy(true);
      try {
        await fn(
          {
            id: video.id,
            docTitle: methods.getValues("title") || video.title,
            fromStatus: video.status,
            collection: "videos",
            docType: "video",
          },
          actor,
        );
        const fresh = await getVideoById(video.id);
        if (fresh) setVideo(fresh);
        showToast(label);
      } catch (err) {
        console.error(err);
        showToast("처리 실패");
      } finally {
        setBusy(false);
      }
    },
    [video, user?.uid, actor, methods, showToast],
  );

  const onReady = useCallback(async () => {
    if (!video) return;
    if (video.status === "DRAFT" || video.status === "IN_REVIEW") {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (video.status === "READY") {
      await runTransition("공개됐어요", transitionToPublished);
    }
  }, [video, runTransition]);

  const onPublish = useCallback(
    () => runTransition("공개됐어요", transitionToPublished),
    [runTransition],
  );
  const onHold = useCallback(
    () => runTransition("보류로 전환했어요", transitionToHold),
    [runTransition],
  );
  const onArchive = useCallback(
    () => runTransition("보관함으로 옮겼어요", transitionToArchived),
    [runTransition],
  );

  useEffect(() => {
    if (!video || video.status !== "DRAFT" || !dirty || !user?.uid) return;
    void runTransition("검수 시작", transitionToInReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.status, dirty]);

  const onReExtracted = useCallback(
    async (res: { fieldsUpdated: string[]; confidence: number }) => {
      if (!video) return;
      const fresh = await getVideoById(video.id);
      if (fresh) {
        setVideo(fresh);
        const values = videoToForm(fresh);
        methods.reset(values);
        setLastSavedValues(values);
      }
      if (res.fieldsUpdated.length > 0) {
        setRecentlyUpdated(new Set(res.fieldsUpdated));
        setTimeout(() => setRecentlyUpdated(new Set()), 1800);
        showToast(
          `${res.fieldsUpdated.length}개 필드 갱신됨 · 신뢰도 ${Math.round(res.confidence * 100)}%`,
        );
      }
    },
    [video, methods, showToast],
  );

  useShortcuts({
    onSave: () => {
      void save().catch(() => {});
    },
    onReady,
    onHold,
  });

  if (loading) {
    return <div className="text-sm text-warm-gray">불러오는 중…</div>;
  }
  if (!video) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/videos"
          className="text-xs text-brand hover:underline"
        >
          ← 검수 큐로
        </Link>
      </div>
    );
  }

  // The form's youtubeUrl is the source of truth for the embedded preview —
  // if the editor pastes a new URL it should be reflected immediately.
  const previewId = extractYoutubeId(
    (methods.watch("youtubeUrl") as string) || video.youtubeUrl,
  ) ?? video.youtubeId;
  const levelKey: VideoLevel | undefined = video.level;
  const accentColor = levelKey ? LEVEL_COLORS[levelKey] : "#6E7D8A";

  return (
    <FormProvider {...methods}>
      <div className="space-y-4 relative pb-4">
        <nav className="text-xs text-warm-gray">
          <Link href="/admin/videos" className="hover:text-ink">
            영상 검수
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{video.title}</span>
        </nav>

        <header className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-serif text-ink">{video.title}</h1>
          <StatusBadge status={video.status} />
          <span className="text-xs text-warm-gray">
            {SERIES_LABELS[video.series]}
            {video.level ? ` · ${LEVEL_LABELS[video.level]}` : ""}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push("/admin/videos")}
            className="text-xs text-warm-gray hover:text-ink"
          >
            ← 목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-start">
          <SourcePane
            target={{
              id: video.id,
              domain: "video",
              youtubeId: previewId,
              officialUrl: video.youtubeUrl,
              accentColorFrom: accentColor,
              accentColorTo: accentColor,
              accentLabel: SERIES_LABELS[video.series],
            }}
            onReExtracted={onReExtracted}
          />
          <VideoFieldsPane
            aiConfidence={video.aiConfidence}
            aiFieldNotes={video.aiFieldNotes}
            autosave={autosaveStatus}
            recentlyUpdated={recentlyUpdated}
          />
        </div>

        <StatusTransitionBar
          status={video.status}
          dirty={dirty}
          canPublish={canPublish}
          busy={busy}
          onSave={() => {
            void save().catch(() => {});
          }}
          onReady={onReady}
          onPublish={onPublish}
          onHold={onHold}
          onArchive={onArchive}
        />

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-xs px-4 py-2 rounded-sm shadow-lg z-50">
            {toast}
          </div>
        ) : null}
      </div>
    </FormProvider>
  );
}
