import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useTrackingSites, useCreateTrackingSite, useDeleteTrackingSite } from "@/hooks/useInbound";
import { Plus, Trash2, Copy, Check, Globe, ArrowLeft, ShieldCheck, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import VerifyInstallDialog from "@/components/VerifyInstallDialog";
import { formatDistanceToNow } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TrackingSettings = () => {
  const { data: sites = [], isLoading } = useTrackingSites();
  const createSite = useCreateTrackingSite();
  const deleteSite = useDeleteTrackingSite();
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [requireConsent, setRequireConsent] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [verifyingSite, setVerifyingSite] = useState<{ id: string; domain: string; verified: boolean } | null>(null);

  const statusFor = (s: any) => {
    if (!s.verified_at) return { label: "Inte installerad", color: "bg-muted-foreground/40", variant: "secondary" as const };
    const ageMs = Date.now() - new Date(s.last_ping_at || s.verified_at).getTime();
    if (ageMs < 24 * 60 * 60 * 1000) return { label: "Aktiv", color: "bg-success", variant: "default" as const };
    return { label: "Inaktiv", color: "bg-warning", variant: "outline" as const };
  };

  const handleCreate = async () => {
    if (!domain.trim()) return;
    try {
      const cleaned = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
      await createSite.mutateAsync({ domain: cleaned, name: name.trim() || undefined, require_consent: requireConsent });
      setDomain(""); setName(""); setRequireConsent(false); setOpen(false);
      toast.success("Webbplats tillagd");
    } catch (err: any) {
      toast.error(err.message || "Kunde inte lägga till");
    }
  };

  const snippetFor = (siteKey: string, requireConsent: boolean) =>
    `<script async src="${SUPABASE_URL}/functions/v1/tracker-script?site=${siteKey}"${requireConsent ? "" : ' data-consent="granted"'}></script>`;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Kopierat");
  };

  return (
    <Layout>
      <div className="container py-8 max-w-3xl space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <Link to="/inbound"><ArrowLeft className="h-4 w-4" /> Tillbaka till Inbound</Link>
          </Button>
          <h1 className="text-3xl font-bold mt-2">Tracking-inställningar</h1>
          <p className="text-muted-foreground mt-1">Installera snippeten på din sajt för att börja spåra besök.</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mina webbplatser</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Lägg till</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Lägg till webbplats</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Domän</Label>
                  <Input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
                </div>
                <div>
                  <Label>Namn (valfritt)</Label>
                  <Input placeholder="Min webbplats" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kräv consent</Label>
                    <p className="text-xs text-muted-foreground">Skript väntar på MailLead.consent() innan tracking startar</p>
                  </div>
                  <Switch checked={requireConsent} onCheckedChange={setRequireConsent} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createSite.isPending || !domain.trim()}>Skapa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card className="p-12 text-center text-muted-foreground">Laddar…</Card>
        ) : sites.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">Ingen webbplats tillagd än</h3>
            <p className="text-sm text-muted-foreground mt-1">Lägg till din första domän för att få ut tracking-koden.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sites.map((s) => {
              const snippet = snippetFor(s.site_key, s.require_consent);
              const status = statusFor(s);
              const lastSeen = s.last_ping_at
                ? formatDistanceToNow(new Date(s.last_ping_at), { addSuffix: true })
                : null;
              return (
                <Card key={s.id} className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{s.name || s.domain}</h3>
                        <Badge variant={status.variant} className="text-[10px] gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${status.color} ${status.label === "Aktiv" ? "animate-pulse" : ""}`} />
                          {status.label}
                        </Badge>
                        {s.require_consent && <Badge variant="outline" className="text-[10px]">Consent krävs</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.domain}
                        {lastSeen && (
                          <> · senast sedd {lastSeen}{s.last_ping_url && ` på ${(() => { try { return new URL(s.last_ping_url).pathname; } catch { return s.last_ping_url; } })()}`}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setVerifyingSite({ id: s.id, domain: s.domain, verified: !!s.verified_at })}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {s.verified_at ? "Verifierad" : "Verifiera"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Ta bort denna webbplats? Historik försvinner inte.")) deleteSite.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {!s.verified_at && (
                    <div className="text-xs bg-primary/5 border border-primary/20 rounded p-3 space-y-1">
                      <div className="font-medium text-foreground">Kom igång på 30 sekunder:</div>
                      <ol className="list-decimal pl-5 text-muted-foreground space-y-0.5">
                        <li>Kopiera snippeten nedan</li>
                        <li>Klistra in i <code>&lt;head&gt;</code> på din sajt och deploya</li>
                        <li>Klicka "Verifiera" — vi upptäcker det automatiskt</li>
                      </ol>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Klistra in i din <code>&lt;head&gt;</code></Label>
                    <div className="relative mt-1">
                      <pre className="bg-muted p-3 pr-10 rounded text-xs overflow-x-auto">
                        <code>{snippet}</code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7"
                        onClick={() => copy(snippet, s.id)}
                      >
                        {copiedKey === s.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Avancerat: identifiera besökare manuellt</summary>
                    <p className="mt-2">När en användare loggar in eller fyller i ett formulär, koppla deras email:</p>
                    <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto"><code>{`window.MailLead.identify('user@example.com');`}</code></pre>
                  </details>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-5 bg-muted/30 border-dashed space-y-4">
          <div>
            <h3 className="font-semibold text-sm">GDPR & integritet</h3>
            <ul className="text-xs text-muted-foreground space-y-1 mt-2 list-disc pl-5">
              <li><strong>Cookieless:</strong> ingen persistent cookie sätts. Besökar-ID härleds från en daglig hash av anonymiserad IP + webbläsare. ePrivacy-direktivet kräver därmed inte samtycke för själva mätningen.</li>
              <li><strong>IP anonymiseras</strong> innan lagring (sista oktetten nollas). Råa IP används endast momentant för företagsuppslag via IPinfo.</li>
              <li><strong>Do Not Track</strong> och <strong>Global Privacy Control</strong> respekteras automatiskt — skriptet skickar inget från sådana besökare.</li>
              <li><strong>Samtycke krävs</strong> som standard innan tracking startar. Sätt <code>data-consent="granted"</code> eller anropa <code>MailLead.consent()</code> efter att besökaren godkänt.</li>
              <li><strong>Datalagring:</strong> besök raderas automatiskt efter 90 dagar, besökare efter 180 dagar.</li>
              <li><strong>Glöm mig:</strong> anropa <code>MailLead.forget()</code> för att radera all data för en besökare.</li>
            </ul>
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium hover:text-foreground">Färdig text till din integritetspolicy</summary>
            <div className="mt-2 p-3 bg-background rounded border text-muted-foreground space-y-2">
              <p>Vi använder ett integritetsvänligt analysverktyg från MailLead för att förstå hur besökare använder vår sajt. Verktyget sätter inga cookies och samlar inte in personuppgifter som direkt kan identifiera dig.</p>
              <p>Vi behandlar: anonymiserad IP-adress, webbläsartyp, besökt sida, tid på sidan, scroll-djup, hänvisande sajt och UTM-parametrar. Datan lagras inom EU (Lovable Cloud) och raderas automatiskt efter 90 dagar.</p>
              <p>Underbiträden: Lovable Cloud (Supabase, EU) och IPinfo (USA) för att slå upp företagsdomän via IP.</p>
            </div>
          </details>
        </Card>

        <Card className="p-5 space-y-2">
          <h3 className="font-semibold text-sm">Auto-tagga mejl-länkar</h3>
          <p className="text-xs text-muted-foreground">
            Vi taggar automatiskt länkar i utgående mejl som pekar på dina spårade domäner med en signerad token. När en mottagare klickar identifieras de mot din lead-lista — och vi kommer ihåg dem vid framtida återbesök på sajten under samma session/dygn. Endast länkar till dina egna domäner taggas; externa länkar (LinkedIn, kalendrar, etc.) lämnas orörda.
          </p>
          <p className="text-xs text-muted-foreground">
            Tokenen rensas automatiskt från URL:en vid sidladdning så den inte läcker via referrers eller bokmärken.
          </p>
        </Card>
      </div>

      {verifyingSite && (
        <VerifyInstallDialog
          open={!!verifyingSite}
          onOpenChange={(o) => !o && setVerifyingSite(null)}
          siteId={verifyingSite.id}
          domain={verifyingSite.domain}
          alreadyVerified={verifyingSite.verified}
        />
      )}
    </Layout>
  );
};

export default TrackingSettings;
