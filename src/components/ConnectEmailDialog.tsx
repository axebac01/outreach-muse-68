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
import { Loader2, Mail } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PRESETS = [
  {
    label: "Gmail",
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    imap_host: "imap.gmail.com",
    imap_port: 993,
  },
  {
    label: "Outlook",
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    imap_host: "outlook.office365.com",
    imap_port: 993,
  },
  {
    label: "Zoho",
    smtp_host: "smtp.zoho.com",
    smtp_port: 465,
    imap_host: "imap.zoho.com",
    imap_port: 993,
  },
];

const ConnectEmailDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [smtpOpen, setSmtpOpen] = useState(false);

  const handleGoogleConnect = async () => {
    setOauthLoading(true);
    try {
      const redirect_uri = `${window.location.origin}/oauth/callback`;
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider: "google", redirect_uri },
      });
      if (error || data?.error || !data?.url) {
        throw new Error(error?.message || data?.error || "Failed to start");
      }
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Failed to start Google sign-in");
      setOauthLoading(false);
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

  const applyPreset = (p: (typeof PRESETS)[number]) => {
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
        throw new Error(error?.message || data?.error || "SMTP test failed");
      }
      setTested(true);
      toast.success(t("emailAccounts.testOk"));
    } catch (e: any) {
      toast.error(e?.message || t("emailAccounts.testFailed"));
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
        throw new Error(error?.message || data?.error || "Failed");
      }
      toast.success(t("emailAccounts.connected"));
      qc.invalidateQueries({ queryKey: ["email_accounts"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("emailAccounts.connectFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("emailAccounts.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("emailAccounts.dialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">
              {t("emailAccounts.preset")}
            </Label>
            <div className="flex gap-2 mt-2">
              {PRESETS.map((p) => (
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

          <div className="rounded-lg border p-4 space-y-3">
            <p className="font-medium text-sm">SMTP ({t("emailAccounts.outgoing")})</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>{t("emailAccounts.host")}</Label>
                <Input
                  value={form.smtp_host}
                  onChange={(e) => update("smtp_host", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("emailAccounts.port")}</Label>
                <Input
                  type="number"
                  value={form.smtp_port}
                  onChange={(e) => update("smtp_port", Number(e.target.value))}
                />
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
                <Input
                  type="password"
                  value={form.smtp_password}
                  onChange={(e) => update("smtp_password", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">
                {t("emailAccounts.useTls")}
              </Label>
              <Switch
                checked={form.smtp_secure}
                onCheckedChange={(v) => update("smtp_secure", v)}
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <p className="font-medium text-sm">
              IMAP ({t("emailAccounts.incoming")}) — {t("common.optional")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>{t("emailAccounts.host")}</Label>
                <Input
                  value={form.imap_host}
                  onChange={(e) => update("imap_host", e.target.value)}
                />
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
                placeholder={t("emailAccounts.sameAsSmtp") as string}
              />
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !form.smtp_host || !form.smtp_password ||
                !form.email}
            >
              {testing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : t("emailAccounts.testConnection")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !tested}
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : t("emailAccounts.save")}
            </Button>
          </div>
          {!tested && (
            <p className="text-xs text-muted-foreground text-right">
              {t("emailAccounts.testFirst")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectEmailDialog;
