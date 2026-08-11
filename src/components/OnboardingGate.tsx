import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";

const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const { data: profile, isLoading, isFetching } = useProfile();
  const location = useLocation();

  // Vänta in färsk data. Vid en pågående refetch (t.ex. direkt efter att
  // onboarding sparats) kan cachen fortfarande innehålla den gamla profilen —
  // redirecta inte på den, då startar onboardingen om i onödan.
  if (isLoading || (isFetching && profile && !profile.onboarding_completed)) return null;

  if (profile && !profile.onboarding_completed && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGate;
