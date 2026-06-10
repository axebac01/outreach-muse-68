import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeaders,
  encryptToken,
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  fetchGoogleUserInfo,
  fetchMicrosoftUserInfo,
  verifyState,
} from "../_shared/oauth.ts";
import { runDeliverabilityCheck } from "../_shared/deliverability.ts";


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
    if (verified.provider !== "google" && verified.provider !== "microsoft") {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGoogle = verified.provider === "google";
    const clientId = isGoogle
      ? Deno.env.get("GOOGLE_CLIENT_ID")
      : Deno.env.get("MICROSOFT_CLIENT_ID");
    const clientSecret = isGoogle
      ? Deno.env.get("GOOGLE_CLIENT_SECRET")
      : Deno.env.get("MICROSOFT_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: `${verified.provider} OAuth not configured` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tokens = isGoogle
      ? await exchangeGoogleCode({
          code, clientId, clientSecret, redirectUri: verified.redirect_uri,
        })
      : await exchangeMicrosoftCode({
          code, clientId, clientSecret, redirectUri: verified.redirect_uri,
        });

    const userInfo = isGoogle
      ? await fetchGoogleUserInfo(tokens.access_token)
      : await fetchMicrosoftUserInfo(tokens.access_token);

    const providerKey = isGoogle ? "gmail" : "outlook";
    const providerAccountId = isGoogle
      ? (userInfo as any).sub
      : (userInfo as any).id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessEnc = await encryptToken(admin, tokens.access_token);
    const refreshEnc = tokens.refresh_token
      ? await encryptToken(admin, tokens.refresh_token)
      : null;

    const { data: existing } = await admin
      .from("email_accounts")
      .select("id, refresh_token_enc")
      .eq("user_id", verified.user_id)
      .eq("provider", providerKey)
      .eq("provider_account_id", providerAccountId)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      user_id: verified.user_id,
      email: userInfo.email,
      display_name: userInfo.name ?? null,
      provider: providerKey,
      provider_account_id: providerAccountId,
      auth_type: "oauth",
      status: "active",
      status_message: null,
      access_token_enc: accessEnc,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000)
        .toISOString(),
      oauth_scopes: tokens.scope,
    };
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

    // Re-arm any sends that got paused while this account was broken.
    await admin
      .from("scheduled_sends")
      .update({
        status: "scheduled",
        error_message: null,
        scheduled_for: new Date().toISOString(),
      })
      .eq("email_account_id", id)
      .eq("status", "paused_account_error");

    // Kör SPF/DKIM/DMARC-koll i bakgrunden — failar tyst.
    try {
      const check = await runDeliverabilityCheck(userInfo.email, providerKey);
      if (check) {
        await admin
          .from("email_accounts")
          .update({
            deliverability_check: check,
            deliverability_checked_at: new Date().toISOString(),
          })
          .eq("id", id);
      }
    } catch (e) {
      console.warn("deliverability check failed", e);
    }


    return new Response(
      JSON.stringify({ ok: true, id, email: userInfo.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("oauth-callback error", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Failed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
