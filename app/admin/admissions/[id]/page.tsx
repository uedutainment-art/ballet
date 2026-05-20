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
import { getAdmissionById } from "@/lib/firebase/queries";
import { recordEdit } from "@/lib/firebase/editLogs";
import { useAuth } from "@/components/providers/AuthProvider";
import { AdmissionFieldsPane } from "@/components/admin/AdmissionFieldsPane";
import { SourcePane } from "@/components/admin/SourcePane";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionBar } from "@/components/admin/StatusTransitionBar";
import { useAutosave } from "@/lib/admin/useAutosave";
import { useShortcuts } from "@/lib/admin/useShortcuts";
import {
  admissionFormSchema,
  type AdmissionFormValues,
} from "@/lib/zod/admission";
import {
  transitionToArchived,
  transitionToHold,
  transitionToInReview,
  transitionToPublished,
  transitionToReady,
} from "@/lib/admin/transitions";
import { isAdminOrAbove } from "@/lib/types/user";
import {
  SCHOOL_TYPE_COLORS,
  SCHOOL_TYPE_LABELS,
  type Admission,
} from "@/lib/types/admission";
import type { ContentStatus } from "@/lib/types/status";

// ---------- Conversion helpers ----------

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

function admissionToForm(a: Admission): AdmissionFormValues {
  return {
    schoolName: a.schoolName ?? "",
    schoolOrgId: a.schoolOrgId ?? "",
    department: a.department ?? "",
    schoolType: a.schoolType,
    year: a.year,
    capacity: a.capacity,
    regStart: tsToInputDate(a.regStart),
    regEnd: tsToInputDate(a.regEnd),
    practical1: tsToInputDate(a.practical1),
    practical2: tsToInputDate(a.practical2),
    announcementAt: tsToInputDate(a.announcementAt),
    subjectsCsv: (a.subjects ?? []).join(", "),
    csat: a.csat,
    fee: a.fee ?? "",
    guidelineUrl: a.guidelineUrl ?? "",
    officialUrl: a.officialUrl ?? "",
    bonusCompetitionsCsv: (a.bonusCompetitions ?? []).join(", "),
    notes: a.notes ?? "",
  };
}

function formToPatch(v: AdmissionFormValues): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    schoolName: v.schoolName,
    department: v.department,
    schoolType: v.schoolType,
    year: typeof v.year === "string" ? Number(v.year) : v.year,
    csat: v.csat,
    officialUrl: v.officialUrl,
    subjects: (v.subjectsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    bonusCompetitions: (v.bonusCompetitionsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    fee: v.fee ?? "",
    guidelineUrl: v.guidelineUrl ?? "",
    notes: v.notes ?? "",
  };
  const regS = inputDateToTs(v.regStart);
  const regE = inputDateToTs(v.regEnd);
  const p1 = inputDateToTs(v.practical1);
  const p2 = inputDateToTs(v.practical2);
  const ann = inputDateToTs(v.announcementAt);
  if (regS) patch.regStart = regS;
  if (regE) patch.regEnd = regE;
  if (p1) patch.practical1 = p1;
  if (p2) patch.practical2 = p2;
  if (ann) patch.announcementAt = ann;
  if (v.capacity !== undefined && v.capacity !== null) {
    patch.capacity = typeof v.capacity === "string" ?
      Number(v.capacity) :
      v.capacity;
  }
  // M10: write schoolOrgId only when present.
  const orgId = (v.schoolOrgId ?? "").trim();
  if (orgId) patch.schoolOrgId = orgId;
  return patch;
}

function diffKeys(
  before: AdmissionFormValues,
  after: AdmissionFormValues,
): string[] {
  const keys = Object.keys(after) as Array<keyof AdmissionFormValues>;
  return keys.filter((k) => before[k] !== after[k]);
}

// ---------- Page ----------

export default function AdmissionEditorPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user, userDoc } = useAuth();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  const [lastSavedValues, setLastSavedValues] =
    useState<AdmissionFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = await getAdmissionById(params.id);
      if (cancelled) return;
      setAdmission(a);
      if (a) {
        const formValues = admissionToForm(a);
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
    if (!admission) return;
    const ok = await methods.trigger();
    if (!ok) {
      showToast("필수 항목을 확인해 주세요");
      throw new Error("validation failed");
    }
    const values = methods.getValues();
    const patch = formToPatch(values);
    patch.lastUpdatedAt = serverTimestamp();
    await updateDoc(doc(db, "admissions", admission.id), patch);

    const changed = lastSavedValues ?
      diffKeys(lastSavedValues, values) :
      Object.keys(values);
    if (changed.length > 0 && user?.uid) {
      await recordEdit({
        docRef: `admissions/${admission.id}`,
        docType: "admission",
        docTitle:
          (values.schoolName || admission.schoolName) +
          " " +
          (values.department || admission.department),
        userId: actor.uid,
        userDisplayName: actor.displayName,
        fromStatus: admission.status,
        toStatus: admission.status,
        changedFields: changed,
      });
    }

    setLastSavedValues(values);
    methods.reset(values, { keepDirty: false });
  }, [admission, methods, lastSavedValues, actor, showToast, user?.uid]);

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
        // swallowed — useAutosave records the error
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
          docType: "admission";
        },
        actor: { uid: string; displayName: string },
      ) => Promise<void>,
    ) => {
      if (!admission || !user?.uid) return;
      setBusy(true);
      try {
        await fn(
          {
            id: admission.id,
            docTitle:
              (methods.getValues("schoolName") || admission.schoolName) +
              " " +
              (methods.getValues("department") || admission.department),
            fromStatus: admission.status,
            collection: "admissions",
            docType: "admission",
          },
          actor,
        );
        const fresh = await getAdmissionById(admission.id);
        if (fresh) setAdmission(fresh);
        showToast(label);
      } catch (err) {
        console.error(err);
        showToast("처리 실패");
      } finally {
        setBusy(false);
      }
    },
    [admission, user?.uid, actor, methods, showToast],
  );

  const onReady = useCallback(async () => {
    if (!admission) return;
    if (admission.status === "DRAFT" || admission.status === "IN_REVIEW") {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (admission.status === "READY") {
      await runTransition("공개됐어요", transitionToPublished);
    }
  }, [admission, runTransition]);

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

  // DRAFT → IN_REVIEW on first edit.
  useEffect(() => {
    if (!admission || admission.status !== "DRAFT" || !dirty || !user?.uid)
      return;
    void runTransition("검수 시작", transitionToInReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admission?.status, dirty]);

  const onReExtracted = useCallback(
    async (res: { fieldsUpdated: string[]; confidence: number }) => {
      if (!admission) return;
      const fresh = await getAdmissionById(admission.id);
      if (fresh) {
        setAdmission(fresh);
        const values = admissionToForm(fresh);
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
    [admission, methods, showToast],
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
  if (!admission) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/admissions"
          className="text-xs text-brand hover:underline"
        >
          ← 검수 큐로
        </Link>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-4 relative pb-4">
        <nav className="text-xs text-warm-gray">
          <Link href="/admin/admissions" className="hover:text-ink">
            입시 검수
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">
            {admission.schoolName} · {admission.department}
          </span>
        </nav>

        <header className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-serif text-ink">
            {admission.schoolName}{" "}
            <span className="text-warm-gray">· {admission.department}</span>
          </h1>
          <StatusBadge status={admission.status} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push("/admin/admissions")}
            className="text-xs text-warm-gray hover:text-ink"
          >
            ← 목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-start">
          <SourcePane
            target={{
              id: admission.id,
              domain: "admission",
              posterUrl: undefined,
              officialUrl: admission.officialUrl,
              accentColorFrom: SCHOOL_TYPE_COLORS[admission.schoolType],
              accentColorTo: SCHOOL_TYPE_COLORS[admission.schoolType],
              accentLabel: SCHOOL_TYPE_LABELS[admission.schoolType],
            }}
            onReExtracted={onReExtracted}
          />
          <AdmissionFieldsPane
            aiConfidence={admission.aiConfidence}
            aiFieldNotes={admission.aiFieldNotes}
            autosave={autosaveStatus}
            recentlyUpdated={recentlyUpdated}
          />
        </div>

        <StatusTransitionBar
          status={admission.status}
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
