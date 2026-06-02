import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Helmet>
        <title>MailLead.ai – Inloggat</title>
        <meta name="description" content="Inloggad vy i MailLead.ai." />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      {children}
    </>
  );
};

export default ProtectedRoute;
