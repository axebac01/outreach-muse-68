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
    if (provider !== "google") {
      return new Response(
        JSON.stringify({ error: "Only google supported right now" }),
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

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_CLIENT_ID not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const state = await signState({
      user_id: userData.user.id,
      provider: "google",
      redirect_uri,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const url = googleAuthUrl({
      clientId,
      redirectUri: redirect_uri,
      state,
    });

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
