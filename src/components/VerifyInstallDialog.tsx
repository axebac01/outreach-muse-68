import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  siteId: string;
  domain: string;
  alreadyVerified: boolean;
}

export default function VerifyInstallDialog({ open, onOpenChange, siteId, domain, alreadyVerified }: Props) {
  const [state, setState] = useState<"waiting" | "success" | "timeout">(alreadyVerified ? "success" : "waiting");
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!open) return;
    setState(alreadyVerified ? "success" : "waiting");
    setSecondsLeft(60);
  }, [open, alreadyVerified]);

  useEffect(() => {
    if (!open || state !== "waiting") return;

    const channel = supabase
      .channel(`verify-${siteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tracking_sites", filter: `id=eq.${siteId}` },
        (payload: any) => {
          if (payload.new?.verified_at) setState("success");
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("tracking_sites")
        .select("verified_at")
        .eq("id", siteId)
        .maybeSingle();
      if (data?.verified_at) setState("success");
      setSecondsLeft((s) => {
        if (s <= 1) {
          setState((cur) => (cur === "waiting" ? "timeout" : cur));
          return 0;
        }
        return s - 1;
      });
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [open, state, siteId]);

  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verifiera installation</DialogTitle>
        </DialogHeader>

        {state === "waiting" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-medium">Väntar på första pingen…</div>
                <div className="text-muted-foreground text-xs mt-0.5">{secondsLeft}s kvar</div>
              </div>
            </div>
            <ol className="text-sm space-y-2 list-decimal pl-5">
              <li>Se till att snippeten är inklistrad i <code>&lt;head&gt;</code> på din sajt och deployad.</li>
              <li>Öppna din sajt i en ny flik.</li>
              <li>Vi upptäcker pingen automatiskt — den här rutan blir grön.</li>
            </ol>
            <Button asChild variant="outline" className="w-full gap-2">
              <a href={url} target="_blank" rel="noreferrer">
                Öppna {domain} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {state === "success" && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg">Snippeten är installerad!</div>
              <p className="text-sm text-muted-foreground mt-1">Vi tar emot besök från din sajt. Inbound-leads börjar dyka upp på /inbound.</p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">Klart</Button>
          </div>
        )}

        {state === "timeout" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-sm">
                <div className="font-medium">Vi hörde inget på 60 sekunder.</div>
                <div className="text-muted-foreground text-xs mt-0.5">Det betyder inte att det är fel — testa felsökningen nedan.</div>
              </div>
            </div>
            <div className="text-sm space-y-2">
              <div className="font-medium">Vanliga orsaker:</div>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-xs">
                <li>Sajten är cachad (CDN/Cloudflare) — vänta några minuter eller töm cache.</li>
                <li>Snippeten är inte i <code>&lt;head&gt;</code> eller saknar deploy.</li>
                <li>Du har en ad-blocker aktiv lokalt — testa i inkognito.</li>
                <li>Strikt CSP — tillåt <code>{`*.functions.supabase.co`}</code>.</li>
                <li>Du besöker fel domän (kontrollera mot domänen ovan).</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setState("waiting"); setSecondsLeft(60); }}>
                Försök igen
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Stäng</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
