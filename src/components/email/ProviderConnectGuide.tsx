import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toUserMessage } from "@/lib/errorMessages";
import { EmailProvider, localized } from "@/lib/emailProviders";

type Props = {
  provider: EmailProvider;
  onBack: () => void;
  onConnected: () => void;
};

const ProviderConnectGuide = ({ provider, onBack, onConnected }: Props) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smtpHost, setSmtpHost] = useState(provider.smtp_host);
  const [smtpPort, setSmtpPort] = useState<number>(provider.smtp_port);
  const [imapHost, setImapHost] = useState(provider.imap_host);
  const [imapPort, setImapPort] = useState<number>(provider.imap_port);

  const cleanPassword = appPassword.replace(/\s+/g, "");
  const canSubmit = email.includes("@") && cleanPassword.length >= 6;

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_secure: provider.smtp_secure,
          smtp_username: email,
          smtp_password: cleanPassword,
          from_email: email,
        },
      });
      if (error || data?.error) throw data?.error ?? error;
      setTested(true);
      toast.success(t("emailAccounts.testOk"));
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "errors.smtp.generic"));
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
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_secure: provider.smtp_secure,
            smtp_username: email,
            smtp_password: cleanPassword,
            imap_host: imapHost,
            imap_port: imapPort,
            imap_secure: provider.imap_secure,
            imap_username: email,
            imap_password: cleanPassword,
          },
        },
      );
      if (error || data?.error) throw data?.error ?? error;
      toast.success(t("emailAccounts.connected"));
      qc.invalidateQueries({ queryKey: ["email_accounts"] });
      onConnected();
    } catch (e: any) {
      toast.error(toUserMessage(e, t, "emailAccounts.connectFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> {t("common.back")}
      </Button>

      <div className="space-y-1">
        <h3 className="font-semibold text-lg">
          {t("emailAccounts.providerGuide.title", { provider: provider.label })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("emailAccounts.providerGuide.subtitle", {
            time: localized(provider.estimatedTime, lang),
          })}
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        {provider.steps.map((step, idx) => (
          <li key={idx} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {idx + 1}
            </span>
            <div className="flex-1">
              <div className="font-medium flex items-center gap-1.5">
                {idx === 0 && provider.requiresAppPassword && (
                  <ShieldCheck className="h-4 w-4 text-success" />
                )}
                {localized(step.title, lang)}
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">
                {localized(step.description, lang)}
              </p>
              {step.linkUrl && step.linkLabel && (
                <a
                  href={step.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-xs inline-flex items-center gap-1 mt-1 hover:underline"
                >
                  {localized(step.linkLabel, lang)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      {provider.note && (
        <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
          <span className="text-muted-foreground">{localized(provider.note, lang)}</span>
        </div>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("emailAccounts.email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setTested(false);
              }}
              placeholder={`you@${provider.emailDomains[0] ?? "company.com"}`}
            />
          </div>
          <div>
            <Label>{t("emailAccounts.displayName")}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alex Smith"
            />
          </div>
        </div>
        <div>
          <Label>
            {provider.requiresAppPassword
              ? t("emailAccounts.providerGuide.appPasswordField")
              : t("emailAccounts.password")}
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={appPassword}
              onChange={(e) => {
                setAppPassword(e.target.value);
                setTested(false);
              }}
              placeholder={provider.passwordPlaceholder ?? "••••••••••••"}
              autoComplete="off"
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t("common.hide") : t("common.show")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {provider.requiresAppPassword && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("emailAccounts.providerGuide.appPasswordHint", { provider: provider.label })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          {showAdvanced
            ? t("emailAccounts.providerGuide.hideAdvanced")
            : t("emailAccounts.providerGuide.showAdvanced")}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 pt-1 border-t">
            <div>
              <Label className="text-xs">SMTP {t("emailAccounts.host")}</Label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">SMTP {t("emailAccounts.port")}</Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">IMAP {t("emailAccounts.host")}</Label>
              <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">IMAP {t("emailAccounts.port")}</Label>
              <Input
                type="number"
                value={imapPort}
                onChange={(e) => setImapPort(Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={testing || !canSubmit}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("emailAccounts.testConnection")}
        </Button>
        <Button onClick={handleSave} disabled={saving || !tested}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("emailAccounts.save")}
        </Button>
      </div>
      {!tested && canSubmit && (
        <p className="text-xs text-muted-foreground text-right">
          {t("emailAccounts.testFirst")}
        </p>
      )}
    </div>
  );
};

export default ProviderConnectGuide;
