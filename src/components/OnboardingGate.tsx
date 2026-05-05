import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();

  if (isLoading) return null;

  if (profile && !profile.onboarding_completed && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGate;
