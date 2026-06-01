import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toUserMessage } from "@/lib/errorMessages";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(toUserMessage(error, t, "errors.auth.invalidCredentials"));
      return;
    }
    toast.success(t("auth.loginSuccess"));
    navigate("/dashboard");
  };

  return (
    <Layout>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-xl border bg-card p-8 space-y-6 shadow-sm border-t-2 border-t-primary">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("auth.loginSub")}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">{t("auth.signup")}</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
