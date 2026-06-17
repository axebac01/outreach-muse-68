import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, Settings, Inbox as InboxIcon, Building2, Users, BarChart3, Mail, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUnreadInboxCount } from "@/hooks/useInbox";
import logo from "@/assets/logo.svg";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useUnsavedChangesGuard } from "@/hooks/useSaveStatus";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SOFT_LAUNCH_MODE, WAITLIST_PATH } from "@/config/launch";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const isApp = location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/campaign") ||
    location.pathname.startsWith("/email-accounts") ||
    location.pathname.startsWith("/inbox") ||
    location.pathname.startsWith("/inbound") ||
    location.pathname.startsWith("/leads") ||
    location.pathname.startsWith("/analytics") ||
    location.pathname.startsWith("/settings");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: unread = 0 } = useUnreadInboxCount();
  useUnsavedChangesGuard();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]">
      <div className="container flex h-16 md:h-20 items-center justify-between gap-2">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 md:gap-2.5 shrink-0" aria-label="MailLead.ai">
          <img src={logo} alt="" className="h-8 md:h-10 w-auto" />
          <span className="font-display text-lg md:text-xl font-extrabold tracking-tight">
            Mail<span className="text-primary">Lead</span><span className="text-muted-foreground hidden sm:inline">.ai</span>
          </span>
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
                  <Button asChild>
                    <Link to={SOFT_LAUNCH_MODE ? WAITLIST_PATH : "/signup"}>
                      {SOFT_LAUNCH_MODE ? "Säkra plats" : t("nav.signup")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                className="p-2"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            {mobileOpen && (
              <div id="mobile-menu" className="absolute top-16 left-0 right-0 border-b bg-background p-4 md:hidden">
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
                      <Button asChild>
                        <Link to={SOFT_LAUNCH_MODE ? WAITLIST_PATH : "/signup"} onClick={() => setMobileOpen(false)}>
                          {SOFT_LAUNCH_MODE ? "Säkra plats" : t("nav.signupShort")}
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Desktop app-nav */}
            <div className="hidden lg:flex items-center gap-1">
              <Button variant="ghost" asChild><Link to="/dashboard">{t("nav.campaigns")}</Link></Button>
              <Button variant="ghost" asChild className="relative">
                <Link to="/inbox" className="gap-1.5">
                  <InboxIcon className="h-4 w-4" /> Unibox
                  {unread > 0 && <Badge className="h-4 min-w-4 px-1 text-[10px] ml-1">{unread}</Badge>}
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/inbound" className="gap-1.5"><Building2 className="h-4 w-4" /> Inbound</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/leads" className="gap-1.5"><Users className="h-4 w-4" /> Leads</Link>
              </Button>
              <Button variant="ghost" asChild><Link to="/email-accounts">{t("nav.emailAccounts")}</Link></Button>
              <Button variant="ghost" asChild><Link to="/analytics">{t("nav.analytics")}</Link></Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings" aria-label="Inställningar"><Settings className="h-4 w-4" /></Link>
              </Button>
              <LanguageSwitcher />
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-4 w-4" /> {t("nav.logout")}
              </Button>
            </div>

            {/* Mobile/tablet quick-access + sheet */}
            <div className="flex items-center gap-1 lg:hidden">
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/inbox" aria-label="Unibox">
                  <InboxIcon className="h-5 w-5" />
                  {unread > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">{unread}</Badge>
                  )}
                </Link>
              </Button>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button aria-label="Öppna meny" className="p-2">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-left text-base">Meny</SheetTitle>
                  </SheetHeader>
                  <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
                    {[
                      { to: "/dashboard", label: t("nav.campaigns"), icon: LayoutDashboard },
                      { to: "/inbox", label: "Unibox", icon: InboxIcon, badge: unread },
                      { to: "/inbound", label: "Inbound", icon: Building2 },
                      { to: "/leads", label: "Leads", icon: Users },
                      { to: "/email-accounts", label: t("nav.emailAccounts"), icon: Mail },
                      { to: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
                      { to: "/settings", label: "Inställningar", icon: Settings },
                    ].map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors ${location.pathname.startsWith(it.to) ? "bg-accent font-medium" : ""}`}
                      >
                        <it.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{it.label}</span>
                        {it.badge && it.badge > 0 ? (
                          <Badge className="h-4 min-w-4 px-1 text-[10px]">{it.badge}</Badge>
                        ) : null}
                      </Link>
                    ))}
                  </nav>
                  <div className="border-t p-3 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      <LanguageSwitcher />
                    </div>
                    <Button variant="outline" className="w-full gap-1.5" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                      <LogOut className="h-4 w-4" /> {t("nav.logout")}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
