"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getPerformanceById } from "@/lib/firebase/queries";
import { recordEdit } from "@/lib/firebase/editLogs";
import { useAuth } from "@/components/providers/AuthProvider";
import { PerformanceFieldsPane } from "@/components/admin/PerformanceFieldsPane";
import { PosterUploadSection } from "@/components/admin/PosterUploadSection";
import { SourcePane } from "@/components/admin/SourcePane";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionBar } from "@/components/admin/StatusTransitionBar";
import { useAutosave } from "@/lib/admin/useAutosave";
import { useShortcuts } from "@/lib/admin/useShortcuts";
import {
  performanceFormSchema,
  type PerformanceFormValues,
} from "@/lib/zod/performance";
import {
  transitionToArchived,
  transitionToHold,
  transitionToInReview,
  transitionToPublished,
  transitionToReady,
} from "@/lib/admin/transitions";
import { isAdminOrAbove } from "@/lib/types/user";
import {
  COMPANY_GRADIENTS,
  COMPANY_TYPE_LABELS,
  type CompanyType,
  type Performance,
} from "@/lib/types/performance";
import type { ContentStatus } from "@/lib/types/status";

function tsToInputDate(t?: Timestamp): string {
  if (!t) return "";
  const d = t.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inputDateToTs(s: string | undefined): Timestamp | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return Timestamp.fromDate(new Date(y, m - 1, d));
}

function performanceToForm(p: Performance): PerformanceFormValues {
  return {
    title: p.title ?? "",
    company: p.company ?? "",
    companyOrgId: p.companyOrgId ?? "",
    venueOrgId: p.venueOrgId ?? "",
    companyType: p.companyType,
    venue: p.venue ?? "",
    dateStart: tsToInputDate(p.dateStart),
    dateEnd: tsToInputDate(p.dateEnd),
    showtimesCsv: (p.showtimes ?? []).join(", "),
    ticketPriceMin: p.ticketPriceMin,
    ticketPriceMax: p.ticketPriceMax,
    ticketUrl: p.ticketUrl ?? "",
    description: p.description ?? "",
    choreographer: p.choreographer ?? "",
    composer: p.composer ?? "",
    runtime: p.runtime,
    ageLimit: p.ageLimit ?? "",
    posterUrl: p.posterUrl ?? "",
    officialUrl: p.officialUrl ?? "",
    notes: p.notes ?? "",
  };
}

function formToPatch(v: PerformanceFormValues): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    title: v.title,
    company: v.company,
    venue: v.venue,
    officialUrl: v.officialUrl,
    showtimes: (v.showtimesCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    description: v.description ?? "",
    choreographer: v.choreographer ?? "",
    composer: v.composer ?? "",
    ageLimit: v.ageLimit ?? "",
    posterUrl: v.posterUrl ?? "",
    ticketUrl: v.ticketUrl ?? "",
    notes: v.notes ?? "",
  };
  if (v.companyType) patch.companyType = v.companyType;
  const dStart = inputDateToTs(v.dateStart);
  const dEnd = inputDateToTs(v.dateEnd);
  if (dStart) patch.dateStart = dStart;
  if (dEnd) patch.dateEnd = dEnd;
  if (v.ticketPriceMin !== undefined && !Number.isNaN(v.ticketPriceMin)) {
    patch.ticketPriceMin = v.ticketPriceMin;
  }
  if (v.ticketPriceMax !== undefined && !Number.isNaN(v.ticketPriceMax)) {
    patch.ticketPriceMax = v.ticketPriceMax;
  }
  if (v.runtime !== undefined && !Number.isNaN(v.runtime)) {
    patch.runtime = v.runtime;
  }
  // M10: only write orgIds if linked.
  const cOrg = (v.companyOrgId ?? "").trim();
  if (cOrg) patch.companyOrgId = cOrg;
  const vOrg = (v.venueOrgId ?? "").trim();
  if (vOrg) patch.venueOrgId = vOrg;
  return patch;
}

function diffKeys(
  before: PerformanceFormValues,
  after: PerformanceFormValues,
): string[] {
  const keys = Object.keys(after) as Array<keyof PerformanceFormValues>;
  return keys.filter((k) => before[k] !== after[k]);
}

export default function PerformanceEditorPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user, userDoc } = useAuth();

  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const methods = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  const [lastSavedValues, setLastSavedValues] =
    useState<PerformanceFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getPerformanceById(params.id);
      if (cancelled) return;
      setPerformance(p);
      if (p) {
        const formValues = performanceToForm(p);
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
    if (!performance) return;
    const ok = await methods.trigger();
    if (!ok) {
      showToast("필수 항목을 확인해 주세요");
      throw new Error("validation failed");
    }
    const values = methods.getValues();
    const patch = formToPatch(values);
    patch.lastUpdatedAt = serverTimestamp();
    await updateDoc(doc(db, "performances", performance.id), patch);

    const changed = lastSavedValues ?
      diffKeys(lastSavedValues, values) :
      Object.keys(values);
    if (changed.length > 0 && user?.uid) {
      await recordEdit({
        docRef: `performances/${performance.id}`,
        docType: "performance",
        docTitle: values.title || performance.title,
        userId: actor.uid,
        userDisplayName: actor.displayName,
        fromStatus: performance.status,
        toStatus: performance.status,
        changedFields: changed,
      });
    }

    setLastSavedValues(values);
    methods.reset(values, { keepDirty: false });
  }, [performance, methods, lastSavedValues, actor, showToast, user?.uid]);

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
          docType: "performance";
        },
        actor: { uid: string; displayName: string },
      ) => Promise<void>,
    ) => {
      if (!performance || !user?.uid) return;
      setBusy(true);
      try {
        await fn(
          {
            id: performance.id,
            docTitle:
              methods.getValues("title") || performance.title,
            fromStatus: performance.status,
            collection: "performances",
            docType: "performance",
          },
          actor,
        );
        const fresh = await getPerformanceById(performance.id);
        if (fresh) setPerformance(fresh);
        showToast(label);
      } catch (err) {
        console.error(err);
        showToast("처리 실패");
      } finally {
        setBusy(false);
      }
    },
    [performance, user?.uid, actor, methods, showToast],
  );

  const onReady = useCallback(async () => {
    if (!performance) return;
    if (
      performance.status === "DRAFT" ||
      performance.status === "IN_REVIEW"
    ) {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (performance.status === "READY") {
      await runTransition("공개됐어요", transitionToPublished);
    }
  }, [performance, runTransition]);

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
    if (
      !performance ||
      performance.status !== "DRAFT" ||
      !dirty ||
      !user?.uid
    )
      return;
    void runTransition("검수 시작", transitionToInReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performance?.status, dirty]);

  const onReExtracted = useCallback(
    async (res: { fieldsUpdated: string[]; confidence: number }) => {
      if (!performance) return;
      const fresh = await getPerformanceById(performance.id);
      if (fresh) {
        setPerformance(fresh);
        const values = performanceToForm(fresh);
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
    [performance, methods, showToast],
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
  if (!performance) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/performances"
          className="text-xs text-brand hover:underline"
        >
          ← 검수 큐로
        </Link>
      </div>
    );
  }

  const ctype: CompanyType = performance.companyType ?? "other";
  const [gFrom, gTo] = COMPANY_GRADIENTS[ctype];

  return (
    <FormProvider {...methods}>
      <div className="space-y-4 relative pb-4">
        <nav className="text-xs text-warm-gray">
          <Link href="/admin/performances" className="hover:text-ink">
            공연 검수
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{performance.title}</span>
        </nav>

        <header className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-serif text-ink">
            {performance.title}{" "}
            <span className="text-warm-gray">· {performance.company}</span>
          </h1>
          <StatusBadge status={performance.status} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push("/admin/performances")}
            className="text-xs text-warm-gray hover:text-ink"
          >
            ← 목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-start">
          <div className="space-y-4">
            <SourcePane
              target={{
                id: performance.id,
                domain: "performance",
                posterUrl: performance.posterUrl,
                officialUrl: performance.officialUrl,
                accentColorFrom: gFrom,
                accentColorTo: gTo,
                accentLabel: performance.companyType ?
                  COMPANY_TYPE_LABELS[performance.companyType] :
                  "기타",
              }}
              onReExtracted={onReExtracted}
            />
            <PosterUploadSection
              collection="performances"
              docId={performance.id}
              currentPosterUrl={performance.posterUrl}
              onPosterUpdated={(newUrl) => {
                setPerformance((prev) =>
                  prev ? { ...prev, posterUrl: newUrl ?? undefined } : prev,
                );
                showToast(newUrl ? "포스터가 저장됐어요" : "포스터가 제거됐어요");
              }}
            />
          </div>
          <PerformanceFieldsPane
            aiConfidence={performance.aiConfidence}
            aiFieldNotes={performance.aiFieldNotes}
            autosave={autosaveStatus}
            recentlyUpdated={recentlyUpdated}
          />
        </div>

        <StatusTransitionBar
          status={performance.status}
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
