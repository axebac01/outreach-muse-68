import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import AppPasswordGuide, {
  GMAIL_PRESET,
} from "./email/AppPasswordGuide";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SMTP_PRESETS = [
  {
    label: "Zoho",
    smtp_host: "smtp.zoho.com",
    smtp_port: 465,
    imap_host: "imap.zoho.com",
    imap_port: 993,
  },
  {
    label: "Fastmail",
    smtp_host: "smtp.fastmail.com",
    smtp_port: 465,
    imap_host: "imap.fastmail.com",
    imap_port: 993,
  },
];

type View = "providers" | "gmail" | "outlook-app" | "smtp";

const ConnectEmailDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "microsoft">(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [view, setView] = useState<View>("providers");

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setView("providers");
      setShowAdvanced(false);
    }
    onOpenChange(v);
  };

  const startOauth = async (provider: "google" | "microsoft") => {
    setOauthLoading(provider);
    try {
      const redirect_uri = `${window.location.origin}/oauth/callback`;
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider, redirect_uri },
      });
      if (error || data?.error || !data?.url) {
        throw new Error(error?.message || data?.error || "Failed to start");
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte starta inloggningen");
      setOauthLoading(null);
    }
  };

  const [form, setForm] = useState({
    email: "",
    display_name: "",
    smtp_host: "",
    smtp_port: 465,
    smtp_secure: true,
    smtp_username: "",
    smtp_password: "",
    imap_host: "",
    imap_port: 993,
    imap_secure: true,
    imap_username: "",
    imap_password: "",
  });

  const update = (k: string, v: any) => {
    setTested(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const applyPreset = (p: (typeof SMTP_PRESETS)[number]) => {
    setForm((f) => ({
      ...f,
      smtp_host: p.smtp_host,
      smtp_port: p.smtp_port,
      imap_host: p.imap_host,
      imap_port: p.imap_port,
    }));
    setTested(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_secure: form.smtp_secure,
          smtp_username: form.smtp_username || form.email,
          smtp_password: form.smtp_password,
          from_email: form.email,
        },
      });
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "SMTP-test misslyckades");
      }
      setTested(true);
      toast.success("Anslutning lyckades");
    } catch (e: any) {
      toast.error(e?.message || "Anslutning misslyckades");
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
            email: form.email,
            display_name: form.display_name || null,
            smtp_host: form.smtp_host,
            smtp_port: form.smtp_port,
            smtp_secure: form.smtp_secure,
            smtp_username: form.smtp_username || form.email,
            smtp_password: form.smtp_password,
            imap_host: form.imap_host || null,
            imap_port: form.imap_port || null,
            imap_secure: form.imap_secure,
            imap_username: form.imap_username || form.email,
            imap_password: form.imap_password || null,
          },
        },
      );
      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Kunde inte spara");
      }
      toast.success("Mejlkonto anslutet");
      qc.invalidateQueries({ queryKey: ["email_accounts"] });
      handleOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Kunde inte ansluta kontot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anslut mejlkonto</DialogTitle>
          <DialogDescription>
            Välj hur du vill ansluta. Vi rekommenderar app-lösenord för bästa
            leverans utan återkommande inloggningar.
          </DialogDescription>
        </DialogHeader>

        {view === "providers" && (
          <div className="space-y-3 pt-2">
            {/* Gmail App Password — recommended */}
            <button
              type="button"
              onClick={() => setView("gmail")}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition px-5 py-4 text-left"
            >
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.29-4.74 3.29-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.98.66-2.24 1.06-3.73 1.06-2.87 0-5.3-1.94-6.17-4.55H2.18v2.85A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.06H2.18a11 11 0 0 0 0 9.88l3.65-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.65 2.85C6.7 7.32 9.13 5.38 12 5.38z" />
              </svg>
              <span className="flex-1">
                <span className="flex items-center gap-2 font-medium">
                  Gmail (app-lösenord)
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                    <Sparkles className="h-3 w-3" /> Rekommenderas
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Säkert, ingen reauth, ~3 min setup
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            {/* Microsoft OAuth */}
            <button
              type="button"
              onClick={() => startOauth("microsoft")}
              disabled={!!oauthLoading}
              className="w-full flex items-center gap-4 rounded-xl border bg-background hover:bg-accent transition px-5 py-4 text-left disabled:opacity-60"
            >
              {oauthLoading === "microsoft" ? (
                <Loader2 className="h-6 w-6 animate-spin shrink-0" />
              ) : (
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#F25022" d="M1 1h10v10H1z" />
                  <path fill="#7FBA00" d="M13 1h10v10H13z" />
                  <path fill="#00A4EF" d="M1 13h10v10H1z" />
                  <path fill="#FFB900" d="M13 13h10v10H13z" />
                </svg>
              )}
              <span className="flex-1">
                <span className="block font-medium">Outlook / Microsoft 365</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Logga in med Microsoft
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            {/* Generic SMTP */}
            <button
              type="button"
              onClick={() => setView("smtp")}
              className="w-full flex items-center gap-4 rounded-xl border bg-background hover:bg-accent transition px-5 py-4 text-left"
            >
              <Mail className="h-6 w-6 shrink-0" />
              <span className="flex-1">
                <span className="block font-medium">Annat (IMAP / SMTP)</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Zoho, Fastmail, egen domän
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition pt-2"
            >
              {showAdvanced ? "Dölj" : "Visa"} avancerade alternativ
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 p-3 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
                  <div className="text-muted-foreground">
                    <strong className="text-foreground">Google OAuth (Testing mode):</strong>{" "}
                    Endast för testanvändare. Du behöver återansluta var 7:e dag. För
                    daglig användning, välj Gmail med app-lösenord ovan.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startOauth("google")}
                  disabled={!!oauthLoading}
                  className="w-full flex items-center gap-4 rounded-xl border bg-background hover:bg-accent transition px-5 py-4 text-left disabled:opacity-60"
                >
                  {oauthLoading === "google" ? (
                    <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                  ) : (
                    <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55c2.08-1.92 3.29-4.74 3.29-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.98.66-2.24 1.06-3.73 1.06-2.87 0-5.3-1.94-6.17-4.55H2.18v2.85A11 11 0 0 0 12 23z" />
                      <path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.06H2.18a11 11 0 0 0 0 9.88l3.65-2.85z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.65 2.85C6.7 7.32 9.13 5.38 12 5.38z" />
                    </svg>
                  )}
                  <span className="flex-1 text-sm">Google OAuth (Testing)</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              </div>
            )}
          </div>
        )}

        {view === "gmail" && (
          <AppPasswordGuide
            preset={GMAIL_PRESET}
            onBack={() => setView("providers")}
            onConnected={() => handleOpenChange(false)}
          />
        )}

        {view === "outlook-app" && (
          <AppPasswordGuide
            preset={OUTLOOK_PRESET}
            onBack={() => setView("providers")}
            onConnected={() => handleOpenChange(false)}
          />
        )}

        {view === "smtp" && (
          <div className="space-y-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("providers")}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
            </Button>

            <div>
              <Label className="text-xs text-muted-foreground">Förinställning</Label>
              <div className="flex gap-2 mt-2">
                {SMTP_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mejladress</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label>Visningsnamn</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => update("display_name", e.target.value)}
                  placeholder="Alex Smith"
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">SMTP (utgående)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Server</Label>
                  <Input
                    value={form.smtp_host}
                    onChange={(e) => update("smtp_host", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.smtp_port}
                    onChange={(e) => update("smtp_port", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Användarnamn</Label>
                  <Input
                    value={form.smtp_username}
                    onChange={(e) => update("smtp_username", e.target.value)}
                    placeholder={form.email}
                  />
                </div>
                <div>
                  <Label>Lösenord</Label>
                  <Input
                    type="password"
                    value={form.smtp_password}
                    onChange={(e) => update("smtp_password", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Använd TLS / SSL</Label>
                <Switch
                  checked={form.smtp_secure}
                  onCheckedChange={(v) => update("smtp_secure", v)}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">IMAP (inkommande) — valfritt</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Server</Label>
                  <Input
                    value={form.imap_host}
                    onChange={(e) => update("imap_host", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.imap_port}
                    onChange={(e) => update("imap_port", Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <Label>Lösenord</Label>
                <Input
                  type="password"
                  value={form.imap_password}
                  onChange={(e) => update("imap_password", e.target.value)}
                  placeholder="Samma som SMTP"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={
                  testing || !form.smtp_host || !form.smtp_password || !form.email
                }
              >
                {testing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : "Testa anslutning"}
              </Button>
              <Button onClick={handleSave} disabled={saving || !tested}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara konto"}
              </Button>
            </div>
            {!tested && (
              <p className="text-xs text-muted-foreground text-right">
                Testa anslutningen innan du sparar
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectEmailDialog;
