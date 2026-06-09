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
