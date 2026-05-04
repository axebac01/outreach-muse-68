import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeaders,
  encryptToken,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  verifyState,
} from "../_shared/oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();
    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "code and state required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const verified = await verifyState(state);
    if (verified.provider !== "google") {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tokens = await exchangeGoogleCode({
      code,
      clientId,
      clientSecret,
      redirectUri: verified.redirect_uri,
    });

    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessEnc = await encryptToken(admin, tokens.access_token);
    const refreshEnc = tokens.refresh_token
      ? await encryptToken(admin, tokens.refresh_token)
      : null;

    // Upsert by (user_id, provider, provider_account_id)
    const { data: existing } = await admin
      .from("email_accounts")
      .select("id, refresh_token_enc")
      .eq("user_id", verified.user_id)
      .eq("provider", "google")
      .eq("provider_account_id", userInfo.sub)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      user_id: verified.user_id,
      email: userInfo.email,
      display_name: userInfo.name ?? null,
      provider: "google",
      provider_account_id: userInfo.sub,
      auth_type: "oauth",
      status: "active",
      status_message: null,
      access_token_enc: accessEnc,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000)
        .toISOString(),
      oauth_scopes: tokens.scope,
    };
    // Only overwrite refresh token if Google actually returned a new one
    if (refreshEnc) payload.refresh_token_enc = refreshEnc;

    let id: string;
    if (existing) {
      const { data, error } = await admin
        .from("email_accounts")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
    } else {
      const { data, error } = await admin
        .from("email_accounts")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
    }

    return new Response(
      JSON.stringify({ ok: true, id, email: userInfo.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("oauth-callback error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
