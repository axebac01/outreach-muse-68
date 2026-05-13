import { useSyncExternalStore } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

let pendingCount = 0;
let status: SaveStatus = "idle";
let savedTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const setStatus = (s: SaveStatus) => {
  status = s;
  emit();
};

export const saveStatusStore = {
  begin() {
    pendingCount++;
    if (savedTimer) {
      clearTimeout(savedTimer);
      savedTimer = null;
    }
    setStatus("saving");
  },
  success() {
    pendingCount = Math.max(0, pendingCount - 1);
    if (pendingCount === 0) {
      setStatus("saved");
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        if (pendingCount === 0 && status === "saved") setStatus("idle");
      }, 2000);
    }
  },
  error() {
    pendingCount = Math.max(0, pendingCount - 1);
    setStatus("error");
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      if (status === "error") setStatus("idle");
    }, 4000);
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSaveStatus = (): SaveStatus =>
  useSyncExternalStore(subscribe, () => status, () => status);
