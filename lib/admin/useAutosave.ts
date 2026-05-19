"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = {
  saving: boolean;
  lastSavedAt: Date | null;
  error: Error | null;
};

type Options = {
  // Any value that changes whenever the form data changes (e.g. a hash of
  // form values). The debounce timer restarts each time this changes.
  changeMarker: unknown;
  // True when there are unsaved changes. The timer only runs while dirty.
  dirty: boolean;
  // Persist function. Throwing sets `error` and clears `lastSavedAt`.
  save: () => Promise<void>;
  // Debounce window in ms. Default 5000.
  debounceMs?: number;
};

// Schedules `save` `debounceMs` after the last `changeMarker` change while
// dirty. Restarts the timer on each change. Flushes once on unmount if still
// dirty (fire-and-forget — the request may not complete before the page tears
// down).

export function useAutosave({
  changeMarker,
  dirty,
  save,
  debounceMs = 5000,
}: Options): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>({
    saving: false,
    lastSavedAt: null,
    error: null,
  });

  const saveRef = useRef(save);
  saveRef.current = save;

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // Debounced save while dirty.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setStatus((s) => ({ ...s, saving: true, error: null }));
      try {
        await saveRef.current();
        setStatus({ saving: false, lastSavedAt: new Date(), error: null });
      } catch (err) {
        setStatus({
          saving: false,
          lastSavedAt: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [changeMarker, dirty, debounceMs]);

  // Flush on unmount.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        void saveRef.current();
      }
    };
  }, []);

  return status;
}
