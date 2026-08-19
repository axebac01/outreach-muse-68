import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/unsubscribe`;

type State =
  | { kind: "loading" }
  | { kind: "confirm"; email: string }
  | { kind: "submitting"; email: string }
  | { kind: "done"; email: string }
  | { kind: "error" };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) {
        setState({ kind: "error" });
        return;
      }
      try {
        const res = await fetch(
          `${FUNCTIONS_URL}?format=json&action=peek&t=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setState({ kind: "confirm", email: data.email ?? "" });
        } else {
          setState({ kind: "error" });
        }
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async (email: string) => {
    setState({ kind: "submitting", email });
    try {
      const res = await fetch(
        `${FUNCTIONS_URL}?format=json&action=confirm&t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setState({ kind: "done", email: data.email ?? email });
      } else {
        setState({ kind: "error" });
      }
    } catch {
      setState({ kind: "error" });
    }
  };

  return (
    <Layout>
      <SeoHead
        title="Avregistrera — MailLead.ai"
        description="Avregistrera din mejladress från fortsatta utskick."
        path="/avregistrera"
        noindex
      />
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-xl border bg-card p-8 space-y-6 shadow-sm border-t-2 border-t-primary text-center">
            {state.kind === "loading" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
                <h1 className="text-xl font-semibold">Ett ögonblick…</h1>
                <p className="text-sm text-muted-foreground">
                  Vi hämtar dina uppgifter.
                </p>
              </>
            )}

            {(state.kind === "confirm" || state.kind === "submitting") && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <MailX className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold">Vill du avregistrera dig?</h1>
                  <p className="text-sm text-muted-foreground">
                    {state.email
                      ? `${state.email} slutar då få mejl från oss.`
                      : "Din adress slutar då få mejl från oss."}
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={state.kind === "submitting"}
                  onClick={() => confirm(state.email)}
                >
                  {state.kind === "submitting" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Ja, avregistrera mig
                </Button>
                <p className="text-xs text-muted-foreground">
                  Ett klick räcker — du behöver inte fylla i något mer.
                </p>
              </>
            )}

            {state.kind === "done" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold">Du är avregistrerad</h1>
                  <p className="text-sm text-muted-foreground">
                    {state.email
                      ? `${state.email} kommer inte längre få mejl från oss.`
                      : "Din adress kommer inte längre få mejl från oss."}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Redan schemalagda uppföljningar har stoppats.
                </p>
              </>
            )}

            {state.kind === "error" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold">Länken fungerade inte</h1>
                  <p className="text-sm text-muted-foreground">
                    Länken är ogiltig eller har brutits på vägen. Prova att
                    kopiera hela adressen från mejlet, eller svara på mejlet så
                    tar avsändaren bort dig manuellt.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Unsubscribe;
