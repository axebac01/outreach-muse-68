import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieBanner from "./CookieBanner";

const APP_PREFIXES = [
  "/dashboard",
  "/campaign",
  "/email-accounts",
  "/inbox",
  "/inbound",
  "/leads",
  "/analytics",
  "/settings",
  "/onboarding",
];

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isApp = APP_PREFIXES.some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!isApp && <Footer />}
      <CookieBanner />
    </div>
  );
};

export default Layout;
