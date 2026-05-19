"use client";

import { useEffect, useRef } from "react";

type Handlers = {
  onSave?: () => void;
  onReady?: () => void;
  onHold?: () => void;
};

// Registers global keyboard shortcuts:
//   ⌘S (or Ctrl+S): onSave  — fires even inside inputs (prevents browser save)
//   ⌘↵            : onReady — fires outside inputs only
//   ⌘.            : onHold  — fires outside inputs only
//
// Shortcuts ignore keyboard input INSIDE text fields except for ⌘S, so editors
// can keep typing periods and Enters without accidentally transitioning state.

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useShortcuts(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const inField = isTypingTarget(e.target);
      const key = e.key.toLowerCase();

      if (key === "s") {
        if (handlersRef.current.onSave) {
          e.preventDefault();
          handlersRef.current.onSave();
        }
        return;
      }
      if (inField) return; // remaining shortcuts skip text fields

      if (key === "enter") {
        if (handlersRef.current.onReady) {
          e.preventDefault();
          handlersRef.current.onReady();
        }
        return;
      }
      if (key === ".") {
        if (handlersRef.current.onHold) {
          e.preventDefault();
          handlersRef.current.onHold();
        }
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
