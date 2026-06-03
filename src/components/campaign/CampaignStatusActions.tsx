import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pause, Play, MoreVertical, StopCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useSequenceStatusActions } from "@/hooks/useSequence";
import { toast } from "sonner";

interface Props {
  sequenceId: string;
  status: string;
  campaignId?: string;
}

export default function CampaignStatusActions({ sequenceId, status, campaignId }: Props) {
  const { pause, resume, complete } = useSequenceStatusActions(sequenceId, campaignId);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (status === "completed") {
    return (
      <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
        <CheckCircle2 className="h-3.5 w-3.5" /> Slutförd
      </Badge>
    );
  }

  if (status === "draft") {
    return null;
  }

  const isActive = status === "active";
  const isPaused = status === "paused";

  return (
    <div className="flex items-center gap-2">
      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            pause.mutate(undefined, {
              onSuccess: () => toast.success("Kampanj pausad — inga nya mejl skickas"),
              onError: (e: any) => toast.error(e?.message || "Kunde inte pausa"),
            })
          }
          disabled={pause.isPending}
        >
          {pause.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
          Pausa
        </Button>
      )}
      {isPaused && (
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            resume.mutate(undefined, {
              onSuccess: () => toast.success("Kampanj aktiv igen"),
              onError: (e: any) => toast.error(e?.message || "Kunde inte återuppta"),
            })
          }
          disabled={resume.isPending}
        >
          {resume.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Återuppta
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setConfirmEnd(true)}
            className="text-destructive focus:text-destructive"
          >
            <StopCircle className="h-3.5 w-3.5 mr-2" /> Avsluta kampanj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta kampanj?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla schemalagda mejl avbryts och kampanjen markeras som slutförd. Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                complete.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Kampanj avslutad");
                    setConfirmEnd(false);
                  },
                  onError: (e: any) => toast.error(e?.message || "Kunde inte avsluta"),
                })
              }
              disabled={complete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {complete.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Avsluta kampanj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
