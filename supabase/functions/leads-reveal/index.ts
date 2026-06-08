import { createClient } from "npm:@supabase/supabase-js@2";
import { apolloMatch } from "../_shared/apollo.ts";
import { corsHeaders } from "../_shared/leadsCors.ts";

const CREDITS_PER_REVEAL = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userSb.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const providerIds: string[] = Array.isArray(body.provider_ids)
      ? body.provider_ids.filter((x: unknown) => typeof x === "string").slice(0, 50)
      : [];
    if (providerIds.length === 0) {
      return new Response(JSON.stringify({ error: "provider_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find leads already revealed for this user (no charge, just return them)
    const { data: alreadyRevealed } = await adminSb
      .from("marketplace_leads")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "apollo")
      .in("provider_id", providerIds);

    const revealedIds = new Set((alreadyRevealed ?? []).map((l: any) => l.provider_id));
    const toReveal = providerIds.filter((id) => !revealedIds.has(id));

    const results: any[] = [...(alreadyRevealed ?? [])];
    const errors: { provider_id: string; error: string }[] = [];

    for (const providerId of toReveal) {
      // Spend credits atomically before calling Apollo
      try {
        await adminSb.rpc("spend_credits", {
          _user_id: userId,
          _amount: CREDITS_PER_REVEAL,
          _reason: "reveal",
          _metadata: { provider: "apollo", provider_id: providerId },
        });
      } catch (e: any) {
        const msg = String(e.message || e);
        if (msg.includes("insufficient_credits")) {
          return new Response(
            JSON.stringify({
              error: "insufficient_credits",
              revealed: results,
              remaining: providerIds.length - results.length,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        errors.push({ provider_id: providerId, error: msg });
        continue;
      }

      // Call Apollo
      try {
        const person = await apolloMatch(providerId);
        if (!person || !person.email) {
          // Refund — Apollo gave us nothing useful
          await adminSb.rpc("add_credits", {
            _user_id: userId,
            _amount: CREDITS_PER_REVEAL,
            _reason: "refund",
            _metadata: { provider: "apollo", provider_id: providerId, reason: "no_email" },
          });
          errors.push({ provider_id: providerId, error: "no_email_available" });
          continue;
        }

        const row = {
          user_id: userId,
          provider: "apollo",
          provider_id: providerId,
          email: person.email,
          full_name: person.name,
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          company: person.organization?.name,
          company_domain: person.organization?.primary_domain || person.organization?.website_url,
          linkedin_url: person.linkedin_url,
          phone: person.phone_numbers?.[0]?.sanitized_number || null,
          city: person.city,
          country: person.country,
          raw: person,
          cost_credits: CREDITS_PER_REVEAL,
        };

        const { data: inserted, error: insErr } = await adminSb
          .from("marketplace_leads")
          .upsert(row, { onConflict: "user_id,provider,provider_id" })
          .select()
          .single();

        if (insErr) {
          errors.push({ provider_id: providerId, error: insErr.message });
          continue;
        }
        results.push(inserted);
      } catch (e: any) {
        // Refund on failure
        await adminSb.rpc("add_credits", {
          _user_id: userId,
          _amount: CREDITS_PER_REVEAL,
          _reason: "refund",
          _metadata: { provider: "apollo", provider_id: providerId, error: String(e.message || e) },
        });
        errors.push({ provider_id: providerId, error: String(e.message || e) });
      }
    }

    const { data: wallet } = await adminSb
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    return new Response(
      JSON.stringify({
        revealed: results,
        errors,
        balance: wallet?.balance ?? 0,
        credits_per_reveal: CREDITS_PER_REVEAL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("leads-reveal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
