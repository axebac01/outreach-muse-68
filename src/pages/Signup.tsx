import Layout from "@/components/Layout";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Circle, Mail, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/lib/errorMessages";
import { z } from "zod";

const passwordRules = (pw: string) => ({
  length: pw.length >= 8,
  upper: /[A-Z]/.test(pw),
  digit: /[0-9]/.test(pw),
});

const signupSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);

  const rules = useMemo(() => passwordRules(password), [password]);
  const valid = signupSchema.safeParse({ name, email, password, confirmPassword }).success;
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmMismatch) {
      setShowConfirmError(true);
      return;
    }
    if (!valid) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(toUserMessage(error, t, "errors.generic.unknown"));
      return;
    }
    navigate(`/verify-email?email=${encodeURIComponent(email)}`);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/onboarding`,
    });
    if (result.error) {
      setLoading(false);
      toast.error(t("auth.googleError"));
      return;
    }
    if (result.redirected) return;
    navigate("/onboarding");
  };

  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      {ok ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Circle className="h-3 w-3" />
      )}
      <span>{label}</span>
    </li>
  );

  return (
    <Layout>
      <SeoHead
        title="Skapa konto — MailLead.ai"
        description="Kom igång gratis med MailLead.ai. Generera personliga kalla mejl per lead och skicka från dina egna Gmail-, Outlook- eller SMTP-konton."
        path="/signup"
      />
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-xl border bg-card p-8 space-y-6 shadow-sm border-t-2 border-t-primary">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{t("auth.signupTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("auth.signupSub")}</p>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              {t("auth.continueWithGoogle")}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("auth.orDivider")}</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input id="name" placeholder={t("auth.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.workEmail")}</Label>
                <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <ul className="space-y-1 pt-1">
                  <Rule ok={rules.length} label={t("auth.pwRule.length")} />
                  <Rule ok={rules.upper} label={t("auth.pwRule.upper")} />
                  <Rule ok={rules.digit} label={t("auth.pwRule.digit")} />
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setShowConfirmError(false);
                  }}
                  onBlur={() => setShowConfirmError(confirmPassword.length > 0 && password !== confirmPassword)}
                  required
                  autoComplete="new-password"
                  aria-invalid={confirmMismatch && showConfirmError}
                />
                {confirmMismatch && showConfirmError && (
                  <p className="text-xs text-destructive">{t("auth.pwMismatch")}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !valid}>
                {loading ? t("auth.creating") : t("auth.signupBtn")}
              </Button>
            </form>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />)}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("auth.testimonial")}</p>
              <p className="text-xs font-medium">{t("auth.testimonialAuthor")}</p>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">{t("auth.login")}</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
