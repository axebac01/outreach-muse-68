import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let prevUserId: string | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
        const newUserId = session?.user.id ?? null;
        // Only log REAL transitions: anonymous→user (real sign-in) and
        // user→anonymous (real sign-out). Skip INITIAL_SESSION and
        // TOKEN_REFRESHED which also emit SIGNED_IN.
        const realSignIn = event === "SIGNED_IN" && prevUserId === null && newUserId !== null;
        const realSignOut = event === "SIGNED_OUT" && prevUserId !== null;
        if (realSignIn || realSignOut) {
          const userId = (realSignIn ? newUserId : prevUserId) as string;
          setTimeout(() => {
            import("@/lib/audit").then(({ logAudit }) => {
              logAudit(realSignIn ? "auth.sign_in" : "auth.sign_out", { user_id: userId });
            });
          }, 0);
        }
        prevUserId = newUserId;
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      prevUserId = session?.user.id ?? null;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
