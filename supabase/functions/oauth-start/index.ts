import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, googleAuthUrl, microsoftAuthUrl, signState } from "../_shared/oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider, redirect_uri } = await req.json();
    if (provider !== "google" && provider !== "microsoft") {
      return new Response(
        JSON.stringify({ error: "Unsupported provider" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!redirect_uri || typeof redirect_uri !== "string") {
      return new Response(JSON.stringify({ error: "redirect_uri required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = provider === "google"
      ? Deno.env.get("GOOGLE_CLIENT_ID")
      : Deno.env.get("MICROSOFT_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: `${provider.toUpperCase()}_CLIENT_ID not configured` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const state = await signState({
      user_id: userData.user.id,
      provider,
      redirect_uri,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
    });

    const url = provider === "google"
      ? googleAuthUrl({ clientId, redirectUri: redirect_uri, state })
      : microsoftAuthUrl({ clientId, redirectUri: redirect_uri, state });

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("oauth-start error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
