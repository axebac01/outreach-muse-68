import { useEffect } from "react";
import { toast } from "sonner";

let pendingCount = 0;

type LabelArg<TVars> = string | ((vars: TVars) => string);

const resolveLabel = <T,>(label: LabelArg<T>, vars: T): string =>
  typeof label === "function" ? (label as (v: T) => string)(vars) : label;

const toastId = (label: string) => `save:${label}`;

/**
 * Wrap mutation options so autosave-mutations show a single, deduplicated
 * sonner toast (bottom-right) describing what was saved.
 *
 * Anti-spam:
 * - Stable id per label so consecutive saves to the same field reuse the same toast.
 * - loading → success/error transitions on the same id, no stacking.
 */
export function withSaveStatus<TVars, TOptions extends {
  mutationFn: (vars: TVars) => Promise<any>;
  onMutate?: (vars: TVars) => any;
  onSuccess?: (...args: any[]) => any;
  onError?: (...args: any[]) => any;
}>(options: TOptions & { label: LabelArg<TVars> }): TOptions {
  const { label, ...rest } = options;
  return {
    ...(rest as unknown as TOptions),
    onMutate: (vars: TVars) => {
      pendingCount++;
      const l = resolveLabel(label, vars);
      toast.loading(`Sparar ${l.toLowerCase()}…`, { id: toastId(l) });
      return options.onMutate?.(vars);
    },
    onSuccess: (data: any, vars: TVars, ctx: any) => {
      pendingCount = Math.max(0, pendingCount - 1);
      const l = resolveLabel(label, vars);
      toast.success(`${l} sparat`, { id: toastId(l), duration: 1500 });
      return options.onSuccess?.(data, vars, ctx);
    },
    onError: (err: any, vars: TVars, ctx: any) => {
      pendingCount = Math.max(0, pendingCount - 1);
      const l = resolveLabel(label, vars);
      toast.error(`Kunde inte spara ${l.toLowerCase()}`, {
        id: toastId(l),
        description: err?.message,
        duration: 5000,
      });
      return options.onError?.(err, vars, ctx);
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
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
};
