import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetails from "./pages/CampaignDetails";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import EmailAccounts from "./pages/EmailAccounts";
import OAuthCallback from "./pages/OAuthCallback";
import Analytics from "./pages/Analytics";
import Onboarding from "./pages/Onboarding";
import Inbox from "./pages/Inbox";
import Inbound from "./pages/Inbound";
import TrackingSettings from "./pages/TrackingSettings";
import Leads from "./pages/Leads";
import LeadsCredits from "./pages/LeadsCredits";
import LeadsCreditsReturn from "./pages/LeadsCreditsReturn";
import OnboardingGate from "@/components/OnboardingGate";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import CookiesPolicy from "./pages/legal/Cookies";
import Subprocessors from "./pages/legal/Subprocessors";
import Dsr from "./pages/legal/Dsr";
import SecurityLog from "./pages/SecurityLog";
import CookieConsent from "./components/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><OnboardingGate><Dashboard /></OnboardingGate></ProtectedRoute>} />
            <Route path="/campaign/new" element={<ProtectedRoute><OnboardingGate><CreateCampaign /></OnboardingGate></ProtectedRoute>} />
            <Route path="/campaign/:id" element={<ProtectedRoute><OnboardingGate><CampaignDetails /></OnboardingGate></ProtectedRoute>} />
            <Route path="/outreach/:id" element={<Navigate to="/dashboard" replace />} />
            <Route path="/sequence/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={<ProtectedRoute><OnboardingGate><Settings /></OnboardingGate></ProtectedRoute>} />
            <Route path="/email-accounts" element={<ProtectedRoute><OnboardingGate><EmailAccounts /></OnboardingGate></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><OnboardingGate><Inbox /></OnboardingGate></ProtectedRoute>} />
            <Route path="/inbound" element={<ProtectedRoute><OnboardingGate><Inbound /></OnboardingGate></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><OnboardingGate><Leads /></OnboardingGate></ProtectedRoute>} />
            <Route path="/leads/credits" element={<ProtectedRoute><OnboardingGate><LeadsCredits /></OnboardingGate></ProtectedRoute>} />
            <Route path="/leads/credits/return" element={<ProtectedRoute><LeadsCreditsReturn /></ProtectedRoute>} />
            <Route path="/settings/tracking" element={<ProtectedRoute><OnboardingGate><TrackingSettings /></OnboardingGate></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><OnboardingGate><Analytics /></OnboardingGate></ProtectedRoute>} />
            <Route path="/settings/email-accounts" element={<Navigate to="/email-accounts" replace />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/cookies" element={<CookiesPolicy />} />
            <Route path="/legal/subprocessors" element={<Subprocessors />} />
            <Route path="/dsr" element={<Dsr />} />
            <Route path="/settings/security" element={<ProtectedRoute><OnboardingGate><SecurityLog /></OnboardingGate></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
