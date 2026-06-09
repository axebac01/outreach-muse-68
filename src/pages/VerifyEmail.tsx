import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/lib/errorMessages";

const RESEND_COOLDOWN = 60;

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error(toUserMessage(error, t, "errors.generic.unknown"));
      return;
    }
    toast.success(t("auth.verify.resentToast"));
    setCooldown(RESEND_COOLDOWN);
  };

  const isGmail = /@gmail\.com$/i.test(email);

  return (
    <Layout>
      <SeoHead
        title="Verifiera din mejladress — MailLead.ai"
        description="Bekräfta din mejladress för att aktivera ditt MailLead.ai-konto."
        path="/verify-email"
        noindex
      />
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-xl border bg-card p-8 space-y-6 shadow-sm border-t-2 border-t-primary text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{t("auth.verify.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.verify.sub")}
              </p>
              {email && (
                <p className="text-base font-medium break-all">{email}</p>
              )}
              <p className="text-sm text-muted-foreground pt-2">
                {t("auth.verify.instructions")}
              </p>
            </div>

            <div className="space-y-2">
              {isGmail && (
                <Button asChild className="w-full" variant="default">
                  <a href="https://mail.google.com" target="_blank" rel="noreferrer">
                    {t("auth.verify.openGmail")}
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={!email || sending || cooldown > 0}
              >
                {cooldown > 0
                  ? t("auth.verify.resendIn", { seconds: cooldown })
                  : sending
                    ? t("auth.verify.sending")
                    : t("auth.verify.resend")}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("auth.verify.spamHint")}
            </p>

            <p className="text-sm text-muted-foreground pt-2 border-t">
              {t("auth.verify.alreadyVerified")}{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t("auth.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VerifyEmail;
