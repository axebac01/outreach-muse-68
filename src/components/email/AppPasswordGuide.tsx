import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type AppPasswordPreset = {
  provider: "gmail" | "outlook";
  label: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  appPasswordUrl: string;
  twoFactorUrl: string;
  workspaceNote?: string;
};

export const GMAIL_PRESET: AppPasswordPreset = {
  provider: "gmail",
  label: "Gmail",
  smtp_host: "smtp.gmail.com",
  smtp_port: 465,
  imap_host: "imap.gmail.com",
  imap_port: 993,
  appPasswordUrl: "https://myaccount.google.com/apppasswords",
  twoFactorUrl: "https://myaccount.google.com/signinoptions/two-step-verification",
  workspaceNote:
    "Använder du Google Workspace? Din admin måste tillåta 'Mindre säkra appar / App-lösenord' i Workspace-konsolen.",
};

export const OUTLOOK_PRESET: AppPasswordPreset = {
  provider: "outlook",
  label: "Outlook",
  smtp_host: "smtp.office365.com",
  smtp_port: 587,
  imap_host: "outlook.office365.com",
  imap_port: 993,
  appPasswordUrl: "https://account.microsoft.com/security",
  twoFactorUrl: "https://account.microsoft.com/security",
  workspaceNote:
    "För Microsoft 365 (jobb/skola) rekommenderar vi 'Anslut med Microsoft' istället — app-lösenord kräver ofta admin-godkännande.",
};

type Props = {
  preset: AppPasswordPreset;
  onBack: () => void;
  onConnected: () => void;
};

const AppPasswordGuide = ({ preset, onBack, onConnected }: Props) => {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);

  const cleanPassword = appPassword.replace(/\s+/g, "");
  const canSubmit = email.includes("@") && cleanPassword.length >= 8;

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          smtp_host: preset.smtp_host,
          smtp_port: preset.smtp_port,
          smtp_secure: true,
          smtp_username: email,
          smtp_password: cleanPassword,
          from_email: email,
        },
      });
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "SMTP-test misslyckades");
      }
      setTested(true);
      toast.success("Anslutning lyckades");
    } catch (e: any) {
      toast.error(
        e?.message ||
          "Anslutning misslyckades. Kontrollera mejlen och app-lösenordet.",
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "connect-smtp-account",
        {
          body: {
            email,
            display_name: displayName || null,
            smtp_host: preset.smtp_host,
            smtp_port: preset.smtp_port,
            smtp_secure: true,
            smtp_username: email,
            smtp_password: cleanPassword,
            imap_host: preset.imap_host,
            imap_port: preset.imap_port,
            imap_secure: true,
            imap_username: email,
            imap_password: cleanPassword,
          },
        },
      );
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Kunde inte spara");
      }
      toast.success("Mejlkonto anslutet");
      qc.invalidateQueries({ queryKey: ["email_accounts"] });
      onConnected();
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte ansluta kontot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
      </Button>

      <div className="space-y-1">
        <h3 className="font-semibold">Anslut {preset.label} med app-lösenord</h3>
        <p className="text-sm text-muted-foreground">
          Säkrare än vanligt lösenord. Inga återkommande inloggningar. Tar ~3 minuter.
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            1
          </span>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" /> Aktivera tvåfaktorsinloggning
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Krävs för att kunna skapa app-lösenord.
            </p>
            <a
              href={preset.twoFactorUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs inline-flex items-center gap-1 mt-1 hover:underline"
            >
              Öppna inställningar <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            2
          </span>
          <div className="flex-1">
            <div className="font-medium">Skapa ett app-lösenord</div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Namnge det "MailLead" så är det lätt att hitta senare.
            </p>
            <a
              href={preset.appPasswordUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs inline-flex items-center gap-1 mt-1 hover:underline"
            >
              Öppna {preset.label === "Gmail" ? "Google" : "Microsoft"}{" "}
              app-lösenord <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            3
          </span>
          <div className="flex-1">
            <div className="font-medium">Klistra in nedan</div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Vi sparar lösenordet krypterat och använder det bara för att skicka mejl
              från denna inkorg.
            </p>
          </div>
        </li>
      </ol>

      {preset.workspaceNote && (
        <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
          <span className="text-muted-foreground">{preset.workspaceNote}</span>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mejladress</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setTested(false);
              }}
              placeholder={
                preset.provider === "gmail" ? "you@gmail.com" : "you@outlook.com"
              }
            />
          </div>
          <div>
            <Label>Visningsnamn</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Smith"
            />
          </div>
        </div>
        <div>
          <Label>App-lösenord</Label>
          <Input
            type="password"
            value={appPassword}
            onChange={(e) => {
              setAppPassword(e.target.value);
              setTested(false);
            }}
            placeholder="xxxx xxxx xxxx xxxx"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground mt-1">
            16 tecken från {preset.label}. Mellanslag tas bort automatiskt.
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={testing || !canSubmit}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testa anslutning"}
        </Button>
        <Button onClick={handleSave} disabled={saving || !tested}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara konto"}
        </Button>
      </div>
      {!tested && canSubmit && (
        <p className="text-xs text-muted-foreground text-right">
          Testa anslutningen innan du sparar
        </p>
      )}
    </div>
  );
};

export default AppPasswordGuide;
