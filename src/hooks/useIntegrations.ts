import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `lov_${b64}`;
}

export const useApiKeys = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_api_keys")
        .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiKey[];
    },
    enabled: !!user,
  });
};

export const useCreateApiKey = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const key = generateKey();
      const key_hash = await sha256Hex(key);
      const key_prefix = key.slice(0, 12);
      const { error } = await supabase
        .from("integration_api_keys")
        .insert({ user_id: user!.id, name, key_hash, key_prefix });
      if (error) throw error;
      return { key, key_prefix };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api_keys"] }),
  });
};

export const useRevokeApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integration_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api_keys"] }),
  });
};
