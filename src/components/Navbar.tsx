import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Settings, Inbox as InboxIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUnreadInboxCount } from "@/hooks/useInbox";
import logo from "@/assets/maillead-logo.png";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const isApp = location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/campaign") ||
    location.pathname.startsWith("/outreach") ||
    location.pathname.startsWith("/email-accounts") ||
    location.pathname.startsWith("/inbox") ||
    location.pathname.startsWith("/sequence") ||
    location.pathname.startsWith("/analytics") ||
    location.pathname.startsWith("/settings");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: unread = 0 } = useUnreadInboxCount();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="MailLead">
          <img src={logo} alt="MailLead" className="h-9 w-auto" />
        </Link>

        {!isApp ? (
          <>
            <div className="hidden items-center gap-8 md:flex">
              <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</Link>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <LanguageSwitcher />
              {user ? (
                <>
                  <Button variant="ghost" asChild><Link to="/dashboard">{t("nav.dashboard")}</Link></Button>
                  <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
                    <LogOut className="h-4 w-4" /> {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild><Link to="/login">{t("nav.login")}</Link></Button>
                  <Button asChild><Link to="/signup">{t("nav.signup")}</Link></Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <LanguageSwitcher />
              <button onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            {mobileOpen && (
              <div className="absolute top-16 left-0 right-0 border-b bg-background p-4 md:hidden">
                <div className="flex flex-col gap-3">
                  <Link to="/pricing" className="text-sm py-2" onClick={() => setMobileOpen(false)}>{t("nav.pricing")}</Link>
                  {user ? (
                    <>
                      <Button variant="ghost" asChild><Link to="/dashboard" onClick={() => setMobileOpen(false)}>{t("nav.dashboard")}</Link></Button>
                      <Button variant="outline" onClick={() => { handleSignOut(); setMobileOpen(false); }}>{t("nav.logout")}</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" asChild><Link to="/login" onClick={() => setMobileOpen(false)}>{t("nav.login")}</Link></Button>
                      <Button asChild><Link to="/signup" onClick={() => setMobileOpen(false)}>{t("nav.signupShort")}</Link></Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild><Link to="/dashboard">{t("nav.campaigns")}</Link></Button>
            <Button variant="ghost" asChild className="relative">
              <Link to="/inbox" className="gap-1.5">
                <InboxIcon className="h-4 w-4" /> Unibox
                {unread > 0 && <Badge className="h-4 min-w-4 px-1 text-[10px] ml-1">{unread}</Badge>}
              </Link>
            </Button>
            <Button variant="ghost" asChild><Link to="/email-accounts">{t("nav.emailAccounts")}</Link></Button>
            <Button variant="ghost" asChild><Link to="/analytics">{t("nav.analytics")}</Link></Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <LanguageSwitcher />
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" /> {t("nav.logout")}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
