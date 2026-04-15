import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Menu, X, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isApp = location.pathname.startsWith("/dashboard") || 
    location.pathname.startsWith("/campaign") || 
    location.pathname.startsWith("/outreach") ||
    location.pathname.startsWith("/settings");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          MailLead.ai
        </Link>

        {!isApp ? (
          <>
            <div className="hidden items-center gap-8 md:flex">
              <Link to="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              {user ? (
                <>
                  <Button variant="ghost" asChild><Link to="/dashboard">Dashboard</Link></Button>
                  <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
                    <LogOut className="h-4 w-4" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                  <Button asChild><Link to="/signup">Start free</Link></Button>
                </>
              )}
            </div>
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {mobileOpen && (
              <div className="absolute top-16 left-0 right-0 border-b bg-background p-4 md:hidden">
                <div className="flex flex-col gap-3">
                  <Link to="/pricing" className="text-sm py-2" onClick={() => setMobileOpen(false)}>Pricing</Link>
                  {user ? (
                    <>
                      <Button variant="ghost" asChild><Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link></Button>
                      <Button variant="outline" onClick={() => { handleSignOut(); setMobileOpen(false); }}>Log out</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" asChild><Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link></Button>
                      <Button asChild><Link to="/signup" onClick={() => setMobileOpen(false)}>Start free</Link></Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild><Link to="/dashboard">Dashboard</Link></Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button asChild><Link to="/campaign/new">New Campaign</Link></Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
