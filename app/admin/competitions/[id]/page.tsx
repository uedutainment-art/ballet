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
import { getCompetitionById } from "@/lib/firebase/queries";
import { recordEdit } from "@/lib/firebase/editLogs";
import { useAuth } from "@/components/providers/AuthProvider";
import { FieldsPane } from "@/components/admin/FieldsPane";
import { SourcePane } from "@/components/admin/SourcePane";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTransitionBar } from "@/components/admin/StatusTransitionBar";
import { useAutosave } from "@/lib/admin/useAutosave";
import { useShortcuts } from "@/lib/admin/useShortcuts";
import {
  competitionFormSchema,
  type CompetitionFormValues,
} from "@/lib/zod/competition";
import {
  transitionToArchived,
  transitionToHold,
  transitionToInReview,
  transitionToPublished,
  transitionToReady,
} from "@/lib/admin/transitions";
import { isAdminOrAbove } from "@/lib/types/user";
import type { Competition } from "@/lib/types/competition";
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

function competitionToForm(c: Competition): CompetitionFormValues {
  return {
    name: c.name ?? "",
    category: c.category,
    host: c.host ?? "",
    edition: c.edition ?? "",
    dateStart: tsToInputDate(c.dateStart),
    dateEnd: tsToInputDate(c.dateEnd),
    registrationStart: tsToInputDate(c.registrationStart),
    registrationEnd: tsToInputDate(c.registrationEnd),
    venue: c.venue ?? "",
    sectionsCsv: (c.sections ?? []).join(", "),
    ageGroupsCsv: (c.ageGroups ?? []).join(", "),
    fee: c.fee ?? "",
    awards: c.awards ?? "",
    officialUrl: c.officialUrl ?? "",
    registerUrl: c.registerUrl ?? "",
    posterUrl: c.posterUrl ?? "",
    notes: c.notes ?? "",
  };
}

function formToPatch(v: CompetitionFormValues): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    name: v.name,
    category: v.category,
    host: v.host,
    venue: v.venue,
    officialUrl: v.officialUrl,
    sections: (v.sectionsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ageGroups: (v.ageGroupsCsv ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    edition: v.edition ?? "",
    fee: v.fee ?? "",
    awards: v.awards ?? "",
    registerUrl: v.registerUrl ?? "",
    posterUrl: v.posterUrl ?? "",
    notes: v.notes ?? "",
  };
  const dateStart = inputDateToTs(v.dateStart);
  const dateEnd = inputDateToTs(v.dateEnd);
  const regStart = inputDateToTs(v.registrationStart);
  const regEnd = inputDateToTs(v.registrationEnd);
  if (dateStart) patch.dateStart = dateStart;
  if (dateEnd) patch.dateEnd = dateEnd;
  if (regStart) patch.registrationStart = regStart;
  if (regEnd) patch.registrationEnd = regEnd;
  return patch;
}

function diffKeys(
  before: CompetitionFormValues,
  after: CompetitionFormValues,
): string[] {
  const keys = Object.keys(after) as Array<keyof CompetitionFormValues>;
  return keys.filter((k) => before[k] !== after[k]);
}

// ---------- Page ----------

export default function EditorPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const { user, userDoc } = useAuth();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const methods = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: undefined,
    mode: "onChange",
  });

  // Snapshot of the last persisted values — used to compute changed fields.
  const [lastSavedValues, setLastSavedValues] =
    useState<CompetitionFormValues | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCompetitionById(params.id);
      if (cancelled) return;
      setCompetition(c);
      if (c) {
        const formValues = competitionToForm(c);
        methods.reset(formValues);
        setLastSavedValues(formValues);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // methods is stable; reset is fine to call here.
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

  // ---------- Save (used by both autosave and ⌘S) ----------

  const save = useCallback(async (): Promise<void> => {
    if (!competition) return;
    const ok = await methods.trigger();
    if (!ok) {
      showToast("필수 항목을 확인해 주세요");
      throw new Error("validation failed");
    }
    const values = methods.getValues();
    const patch = formToPatch(values);
    patch.lastUpdatedAt = serverTimestamp();
    await updateDoc(doc(db, "competitions", competition.id), patch);

    // Log only the fields that actually changed since last save.
    const changed = lastSavedValues
      ? diffKeys(lastSavedValues, values)
      : Object.keys(values);
    if (changed.length > 0 && user?.uid) {
      await recordEdit({
        docRef: `competitions/${competition.id}`,
        docType: "competition",
        docTitle: values.name || competition.name,
        userId: actor.uid,
        userDisplayName: actor.displayName,
        fromStatus: competition.status,
        toStatus: competition.status,
        changedFields: changed,
      });
    }

    setLastSavedValues(values);
    methods.reset(values, { keepDirty: false });
  }, [competition, methods, lastSavedValues, actor, showToast, user?.uid]);

  // ---------- Autosave wiring ----------

  // Subscribe to all values for the change marker. Cheap enough for ~16
  // fields; switch to per-field subscriptions if the form grows.
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

  // ---------- Status transitions ----------

  const runTransition = useCallback(
    async (
      label: string,
      fn: (
        ctx: { id: string; docTitle: string; fromStatus: ContentStatus },
        actor: { uid: string; displayName: string },
      ) => Promise<void>,
    ) => {
      if (!competition || !user?.uid) return;
      setBusy(true);
      try {
        await fn(
          {
            id: competition.id,
            docTitle: methods.getValues("name") || competition.name,
            fromStatus: competition.status,
          },
          actor,
        );
        // Refetch to update local status badge / available transitions.
        const fresh = await getCompetitionById(competition.id);
        if (fresh) setCompetition(fresh);
        showToast(label);
      } catch (err) {
        console.error(err);
        showToast("처리 실패");
      } finally {
        setBusy(false);
      }
    },
    [competition, user?.uid, actor, methods, showToast],
  );

  const onReady = useCallback(async () => {
    if (!competition) return;
    if (competition.status === "DRAFT") {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (competition.status === "IN_REVIEW") {
      await runTransition("READY로 넘김", transitionToReady);
    } else if (competition.status === "READY") {
      await runTransition("공개됐어요", transitionToPublished);
    }
  }, [competition, runTransition]);

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

  // Move DRAFT → IN_REVIEW automatically on first edit.
  useEffect(() => {
    if (!competition || competition.status !== "DRAFT" || !dirty || !user?.uid)
      return;
    void runTransition("검수 시작", transitionToInReview);
    // Only fire once per mount + per dirty flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition?.status, dirty]);

  // ---------- Shortcuts ----------

  useShortcuts({
    onSave: () => {
      void save().catch(() => {});
    },
    onReady,
    onHold,
  });

  // ---------- Render ----------

  if (loading) {
    return <div className="text-sm text-warm-gray">불러오는 중…</div>;
  }
  if (!competition) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-warm-gray">찾을 수 없어요</div>
        <Link
          href="/admin/competitions"
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
          <Link href="/admin/competitions" className="hover:text-ink">
            콩쿠르 검수
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{competition.name}</span>
        </nav>

        <header className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-serif text-ink">{competition.name}</h1>
          <StatusBadge status={competition.status} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => router.push("/admin/competitions")}
            className="text-xs text-warm-gray hover:text-ink"
          >
            ← 목록으로
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 items-start">
          <SourcePane competition={competition} />
          <FieldsPane
            aiConfidence={competition.aiConfidence}
            aiFieldNotes={competition.aiFieldNotes}
            autosave={autosaveStatus}
          />
        </div>

        <StatusTransitionBar
          status={competition.status}
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
