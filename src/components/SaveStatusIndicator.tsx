import { Check, Loader2, AlertCircle } from "lucide-react";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { cn } from "@/lib/utils";

export const SaveStatusIndicator = ({ className }: { className?: string }) => {
  const status = useSaveStatus();

  if (status === "idle") {
    return <div className={cn("h-5", className)} aria-hidden />;
  }

  const map = {
    saving: { icon: Loader2, text: "Sparar…", cls: "text-muted-foreground", spin: true },
    saved: { icon: Check, text: "Sparat", cls: "text-emerald-600 dark:text-emerald-500", spin: false },
    error: { icon: AlertCircle, text: "Kunde inte spara", cls: "text-destructive", spin: false },
  } as const;

  const { icon: Icon, text, cls, spin } = map[status];

  return (
    <div
      className={cn("flex items-center gap-1.5 text-xs font-medium transition-opacity", cls, className)}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
      <span>{text}</span>
    </div>
  );
};
