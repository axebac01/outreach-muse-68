import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True once the initial session has been restored from storage. */
  ready: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  ready: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let prevUserId: string | null = null;

    // Subscribe FIRST so we don't miss events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
        const newUserId = session?.user.id ?? null;
        const realSignIn = event === "SIGNED_IN" && prevUserId === null && newUserId !== null;
        if (realSignIn) {
          setTimeout(() => {
            import("@/lib/audit").then(({ logAudit }) => {
              logAudit("auth.sign_in");
            });
          }, 0);
        }
        prevUserId = newUserId;
      }
    );

    // Then restore from storage. Mark ready only after this resolves so
    // queries that need auth.uid() don't fire before the JWT is attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      prevUserId = session?.user.id ?? null;
      setLoading(false);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit("auth.sign_out");
    } catch {
      // never block sign-out
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, ready, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
