import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

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
  error(message?: string) {
    pendingCount = Math.max(0, pendingCount - 1);
    setStatus("error");
    // Dedupera: samma toast-id överskrivs istället för att stapla
    toast.error("Kunde inte spara ändringen", {
      id: "save-status-error",
      description: message,
    });
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      if (status === "error") setStatus("idle");
    }, 4000);
  },
  isSaving() {
    return pendingCount > 0;
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSaveStatus = (): SaveStatus =>
  useSyncExternalStore(subscribe, () => status, () => status);

/**
 * Wrap mutation options to automatically report progress to the global
 * save-status store. Preserves any user-provided onMutate/onSuccess/onError.
 */
export function withSaveStatus<TOptions extends {
  onMutate?: (...args: any[]) => any;
  onSuccess?: (...args: any[]) => any;
  onError?: (...args: any[]) => any;
}>(options: TOptions): TOptions {
  return {
    ...options,
    onMutate: (...args: any[]) => {
      saveStatusStore.begin();
      return options.onMutate?.(...args);
    },
    onSuccess: (...args: any[]) => {
      saveStatusStore.success();
      return options.onSuccess?.(...args);
    },
    onError: (...args: any[]) => {
      const err = args[0];
      saveStatusStore.error(err?.message);
      return options.onError?.(...args);
    },
  };
}

/**
 * Warn the user before they close the tab while autosave is in flight.
 * Mount once at the app shell.
 */
export const useUnsavedChangesGuard = () => {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatusStore.isSaving()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
};
