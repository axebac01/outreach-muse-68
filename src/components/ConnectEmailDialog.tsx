import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Sparkles,
  Settings2,
} from "lucide-react";
import ProviderConnectGuide from "./email/ProviderConnectGuide";
import {
  EmailProvider,
  detectProviderByEmail,
  getVisibleProviders,
} from "@/lib/emailProviders";
import { toUserMessage } from "@/lib/errorMessages";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type View =
  | { kind: "providers" }
  | { kind: "guide"; provider: EmailProvider }
  | { kind: "custom" };

const ConnectEmailDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "microsoft">(null);
  const [view, setView] = useState<View>({ kind: "providers" });
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [sameAsSmtp, setSameAsSmtp] = useState(true);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setView({ kind: "providers" });
      setSavedEmail(null);
    }
    onOpenChange(v);
  };

  const startMicrosoftOauth = async () => {
    setOauthLoading("microsoft");
    try {
      const redirect_uri = `${window.location.origin}/oauth/callback`;
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider: "microsoft", redirect_uri },
      });
      if (error || data?.error || !data?.url) {
        throw data?.error ?? error ?? new Error("oauth_start_failed");
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "errors.auth.oauthFailed"));
      setOauthLoading(null);
    }
  };

  // ----- Custom SMTP/IMAP form state -----
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

  // Resolved IMAP values (mirroring SMTP when toggle is on).
  const resolvedImap = useMemo(() => {
    if (!sameAsSmtp) {
      return {
        host: form.imap_host,
        port: form.imap_port,
        password: form.imap_password || form.smtp_password,
        secure: form.imap_secure,
      };
    }
    const host = form.smtp_host.replace(/^smtp\./i, "imap.");
    return { host, port: 993, password: form.smtp_password, secure: true };
  }, [sameAsSmtp, form]);

  // Detect provider from email domain (for "use guide instead" prompt).
  const detected = useMemo(
    () => (form.email.includes("@") ? detectProviderByEmail(form.email) : undefined),
    [form.email],
  );

  const runTest = async (): Promise<boolean> => {
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
      if (error || data?.error) throw data?.error ?? error;
      setTested(true);
      return true;
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "errors.smtp.generic"));
      return false;
    } finally {
      setTesting(false);
    }
  };

  const handleTest = async () => {
    const ok = await runTest();
    if (ok) toast.success(t("emailAccounts.testOk"));
  };

  const handleSave = async () => {
    if (!tested) {
      const ok = await runTest();
      if (!ok) return;
    }
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
            imap_host: resolvedImap.host || null,
            imap_port: resolvedImap.port || null,
            imap_secure: resolvedImap.secure,
            imap_username: form.imap_username || form.email,
            imap_password: resolvedImap.password || null,
          },
        },
      );
      if (error || data?.error) throw data?.error ?? error;
      toast.success(t("emailAccounts.connected"));
      qc.invalidateQueries({ queryKey: ["email_accounts"] });
      setSavedEmail(form.email);
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "emailAccounts.connectFailed"));
    } finally {
      setSaving(false);
    }
  };

  const onPortChange = (port: number) => {
    setForm((f) => ({ ...f, smtp_port: port, smtp_secure: port === 465 }));
    setTested(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("emailAccounts.providerPicker.title")}</DialogTitle>
          <DialogDescription>
            {t("emailAccounts.providerPicker.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {view.kind === "providers" && (
          <div className="space-y-2 pt-2">
            {/* Microsoft OAuth — one-click */}
            <button
              type="button"
              onClick={startMicrosoftOauth}
              disabled={!!oauthLoading}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition px-5 py-4 text-left disabled:opacity-60"
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
                <span className="flex items-center gap-2 font-medium">
                  {t("emailAccounts.providerPicker.microsoftLabel")}
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                    <Sparkles className="h-3 w-3" />
                    {t("emailAccounts.providerPicker.oneClick")}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("emailAccounts.providerPicker.microsoftDesc")}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
            <p className="px-1 text-[11px] leading-snug text-muted-foreground">
              {t("emailAccounts.providerPicker.microsoftNote")}
            </p>


            {/* Catalog providers */}
            {getVisibleProviders().map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setView({ kind: "guide", provider: p })}
                className="w-full flex items-center gap-4 rounded-xl border bg-background hover:bg-accent transition px-5 py-4 text-left"
              >
                <span
                  className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${p.tileTint}`}
                >
                  <Mail className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {p.label}
                    {p.recommended && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                        {t("emailAccounts.providerPicker.recommended")}
                      </span>
                    )}
                    {p.requiresAppPassword && (
                      <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {t("emailAccounts.providerPicker.appPasswordTag")}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {p.emailDomains.length > 0
                      ? p.emailDomains.slice(0, 2).map((d) => `@${d}`).join(", ")
                      : p.smtp_host}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            ))}

            {/* Custom domain */}
            <button
              type="button"
              onClick={() => setView({ kind: "custom" })}
              className="w-full flex items-center gap-4 rounded-xl border border-dashed bg-background hover:bg-accent transition px-5 py-4 text-left"
            >
              <span className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                <Settings2 className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">
                  {t("emailAccounts.providerPicker.customLabel")}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("emailAccounts.providerPicker.customDesc")}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {view.kind === "guide" && !savedEmail && (
          <ProviderConnectGuide
            provider={view.provider}
            onBack={() => setView({ kind: "providers" })}
            onConnected={() => handleOpenChange(false)}
          />
        )}

        {view.kind === "custom" && !savedEmail && (
          <div className="space-y-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView({ kind: "providers" })}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> {t("common.back")}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("emailAccounts.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label>{t("emailAccounts.displayName")}</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => update("display_name", e.target.value)}
                  placeholder="Alex Smith"
                />
              </div>
            </div>

            {detected && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span>
                  {t("emailAccounts.custom.detectedProvider", { provider: detected.label })}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setView({ kind: "guide", provider: detected })}
                >
                  {t("emailAccounts.custom.useGuide", { provider: detected.label })}
                </Button>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">SMTP ({t("emailAccounts.outgoing")})</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>{t("emailAccounts.host")}</Label>
                  <Input
                    value={form.smtp_host}
                    onChange={(e) => update("smtp_host", e.target.value)}
                    placeholder="smtp.dindomän.se"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t("emailAccounts.custom.hostHint")}
                  </p>
                </div>
                <div>
                  <Label>{t("emailAccounts.port")}</Label>
                  <Select
                    value={String(form.smtp_port)}
                    onValueChange={(v) => onPortChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="465">{t("emailAccounts.custom.portSsl")}</SelectItem>
                      <SelectItem value="587">{t("emailAccounts.custom.portStartTls")}</SelectItem>
                      <SelectItem value="25">{t("emailAccounts.custom.portPlain")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("emailAccounts.username")}</Label>
                  <Input
                    value={form.smtp_username}
                    onChange={(e) => update("smtp_username", e.target.value)}
                    placeholder={form.email}
                  />
                </div>
                <div>
                  <Label>{t("emailAccounts.password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPwd ? "text" : "password"}
                      value={form.smtp_password}
                      onChange={(e) => update("smtp_password", e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPwd ? t("common.hide") : t("common.show")}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  IMAP ({t("emailAccounts.incoming")})
                </p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Switch
                    checked={sameAsSmtp}
                    onCheckedChange={(v) => {
                      setSameAsSmtp(v);
                      setTested(false);
                    }}
                  />
                  {t("emailAccounts.custom.sameAsSmtpToggle")}
                </label>
              </div>
              {!sameAsSmtp && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label>{t("emailAccounts.host")}</Label>
                      <Input
                        value={form.imap_host}
                        onChange={(e) => update("imap_host", e.target.value)}
                        placeholder="imap.dindomän.se"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t("emailAccounts.custom.imapHostHint")}
                      </p>
                    </div>
                    <div>
                      <Label>{t("emailAccounts.port")}</Label>
                      <Input
                        type="number"
                        value={form.imap_port}
                        onChange={(e) => update("imap_port", Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("emailAccounts.password")}</Label>
                    <Input
                      type="password"
                      value={form.imap_password}
                      onChange={(e) => update("imap_password", e.target.value)}
                      placeholder={t("emailAccounts.sameAsSmtp")}
                    />
                  </div>
                  {!form.imap_host && (
                    <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{t("emailAccounts.custom.noImapWarning")}</span>
                    </div>
                  )}
                </>
              )}
              {sameAsSmtp && (
                <p className="text-xs text-muted-foreground">
                  {resolvedImap.host
                    ? `${resolvedImap.host}:${resolvedImap.port}`
                    : t("emailAccounts.custom.imapHostHint")}
                </p>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || saving || !form.smtp_host || !form.smtp_password || !form.email}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("emailAccounts.testConnection")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || testing || !form.smtp_host || !form.smtp_password || !form.email}
              >
                {saving || (testing && !tested) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("emailAccounts.save")
                )}
              </Button>
            </div>
          </div>
        )}

        {savedEmail && (
          <div className="space-y-5 py-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {t("emailAccounts.success.title")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("emailAccounts.success.subtitle", { email: savedEmail })}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSavedEmail(null);
                  setForm({
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
                  setTested(false);
                  setView({ kind: "providers" });
                }}
              >
                {t("emailAccounts.success.addAnother")}
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                {t("emailAccounts.success.done")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectEmailDialog;
