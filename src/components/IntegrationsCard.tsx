import { useState } from "react";
import { Plug, Plus, Copy, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks/useIntegrations";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-leads`;

const buildPrompt = (key: string) => `Lägg till en "Skicka till Outreach"-integration så jag kan exportera utvalda contacts/companies som leads till min andra Lovable-app.

Outreach API-konfiguration (förifyllt):
- Endpoint: ${ENDPOINT}
- API-nyckel: ${key}

1. Settings → Integrations: ny sektion "Outreach". Spara följande i en ny tabell outreach_integration_settings (en rad per user_id):
   - endpoint_url (text, default: "${ENDPOINT}")
   - api_key (text, lagras krypterat med pgp_sym_encrypt; använd OUTREACH_API_KEY som krypteringsnyckel via Supabase secret om möjligt)
   - default_target_type ('sequence' | 'campaign' | 'none', default 'none')
   - default_target_id (text, nullable)
   En "Testa anslutning"-knapp som POSTar { "source":"company-intel-hub", "target":{"type":"none"}, "leads":[] } och visar OK/fel.

2. På Companies-, Contacts-, People- och ImportDetail-sidan: lägg till bulk-action "Skicka till Outreach" på markerade rader. Knappen öppnar en dialog där användaren kan:
   - välja target (sequence/campaign/none), override mot default
   - se preview på antal leads
   - bekräfta

3. Skapa edge function send-to-outreach som:
   - tar emot { ids: string[], source_table: 'companies'|'contacts'|'contact_people', target: {...} }
   - validerar JWT
   - läser ut motsvarande rader, mappar till outreach-format:
     * från contacts (generic_email): { email: c.value, company: company.name, website: company.website, notes: 'Generic email from ' + company.name }
     * från contact_people: { full_name, first_name, last_name, role: role_title, company: company.name, website: company.website } – skippa rader utan giltig email
     * från companies: hämta första generic email per bolag
   - chunkar i max 500 leads/request
   - POSTar till endpoint_url med header Authorization: Bearer <api_key>
   - returnerar { inserted, skipped, errors[] } och visar toast i UI
   - loggar i ny tabell outreach_send_log (user_id, count, target, response, created_at)

4. Outreach API-format (det som ska POSTas):
POST ${ENDPOINT}
Authorization: Bearer ${key}
Content-Type: application/json
{
  "source": "company-intel-hub",
  "target": { "type": "sequence" | "campaign" | "none", "id": "<uuid eller null>" },
  "leads": [
    { "email": "...", "full_name": "...", "first_name": "...", "last_name": "...",
      "company": "...", "role": "...", "phone": "...", "website": "...",
      "linkedin_url": "...", "notes": "..." }
  ]
}
Skippa rader utan giltig email.

5. Lägg till en kolumn sent_to_outreach_at (timestamptz) på contacts och contact_people så vi inte skickar dubbletter, och filtrera bort rader som redan har värde.`;

const IntegrationsCard = () => {
  const { data: keys = [] } = useApiKeys();
  const createKey = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Ange ett namn");
    try {
      const { key } = await createKey.mutateAsync(name.trim());
      setCreatedKey(key);
      setName("");
    } catch (e: any) {
      toast.error(e.message || "Misslyckades");
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopierad`);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4 card-hover">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Integrationer</h2>
            <p className="text-sm text-muted-foreground">API-nycklar för att importera leads från externa appar</p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setOpen(true); setCreatedKey(null); }}>
          <Plus className="h-4 w-4" /> Ny nyckel
        </Button>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
        <div className="font-medium">Endpoint</div>
        <div className="flex items-center gap-2">
          <code className="text-[11px] flex-1 truncate">{ENDPOINT}</code>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copy(ENDPOINT, "Endpoint")}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Inga API-nycklar än.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{k.name}</span>
                  {k.revoked_at && <span className="text-[10px] uppercase text-destructive font-semibold">Återkallad</span>}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                <div className="text-xs text-muted-foreground">
                  {k.last_used_at ? `Senast använd ${new Date(k.last_used_at).toLocaleString()}` : "Aldrig använd"}
                </div>
              </div>
              {!k.revoked_at && (
                <Button variant="ghost" size="sm" onClick={() => revoke.mutate(k.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCreatedKey(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{createdKey ? "Nyckel skapad" : "Ny API-nyckel"}</DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Kopiera nyckeln nu — den visas bara en gång."
                : "Ge nyckeln ett namn (t.ex. namnet på appen som ska använda den)."}
            </DialogDescription>
          </DialogHeader>

          {!createdKey ? (
            <div className="space-y-3">
              <Label className="text-xs">Namn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Intel Hub" autoFocus />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>Spara nyckeln på ett säkert ställe. Vi kan inte visa den igen.</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">API-nyckel</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded p-2 break-all">{createdKey}</code>
                  <Button variant="outline" size="sm" onClick={() => copy(createdKey, "Nyckel")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Prompt för Company Intel Hub</Label>
                <p className="text-xs text-muted-foreground">
                  Klistra in den här i ditt andra projekt så bygger Lovable utskickssidan automatiskt.
                </p>
                <Button variant="default" size="sm" className="gap-2" onClick={() => copy(buildPrompt(createdKey), "Prompt")}>
                  <Copy className="h-3.5 w-3.5" /> Kopiera prompt
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!createdKey ? (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Avbryt</Button>
                <Button onClick={handleCreate} disabled={createKey.isPending}>
                  {createKey.isPending ? "Skapar…" : "Skapa nyckel"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>
                <Check className="h-4 w-4" /> Klar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsCard;
