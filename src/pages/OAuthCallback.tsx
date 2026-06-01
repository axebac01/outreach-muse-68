import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/lib/errorMessages";

const OAuthCallback = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const errParam = params.get("error");
    const errDesc = params.get("error_description") || "";

    if (errParam) {
      setStatus("error");
      // Microsoft sends AADSTS codes inside error_description; surface both
      // to toUserMessage so it can map AADSTS65001 → admin consent etc.
      setMessage(
        toUserMessage(
          { code: errParam, message: errDesc || errParam, detail: errDesc },
          t,
          "errors.auth.oauthFailed",
        ),
      );
      return;
    }
    if (!code || !state) {
      setStatus("error");
      setMessage(t("errors.auth.oauthFailed"));
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "oauth-callback",
          { body: { code, state } },
        );
        if (error || data?.error) {
          throw data?.error ?? error ?? new Error("Failed");
        }
        setStatus("ok");
        setMessage(data.email);
        setTimeout(() => navigate("/email-accounts"), 1500);
      } catch (e: any) {
        setStatus("error");
        setMessage(toUserMessage(e, t, "errors.auth.oauthFailed"));
      }
    })();
  }, [params, navigate, t]);


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">
              {t("oauthCallback.connecting", "Connecting your account...")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("oauthCallback.wait", "This will only take a moment.")}
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h1 className="text-xl font-semibold">
              {t("oauthCallback.success", "Account connected!")}
            </h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">
              {t("oauthCallback.failed", "Connection failed")}
            </h1>
            <p className="text-sm text-muted-foreground break-words">
              {message}
            </p>
            <Button onClick={() => navigate("/email-accounts")}>
              {t("common.back")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
