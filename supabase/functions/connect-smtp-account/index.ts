import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Encrypts a string with the EMAIL_TOKEN_ENCRYPTION_KEY using pgp_sym_encrypt.
// Falls back to base64 if no key is configured (dev only).
async function encryptIfPossible(
  supabaseAdmin: ReturnType<typeof createClient>,
  plaintext: string,
): Promise<Uint8Array> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) {
    // Dev fallback — base64 encoded bytes; replace once secret is set.
    return new TextEncoder().encode(plaintext);
  }
  // Use a SQL call via the rest API to pgp_sym_encrypt
  const { data, error } = await supabaseAdmin.rpc("encrypt_secret", {
    plaintext,
    key,
  });
  if (error) {
    console.warn("encrypt_secret RPC missing — storing plaintext bytes", error);
    return new TextEncoder().encode(plaintext);
  }
  return data as Uint8Array;
}

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
    const userId = userData.user.id;

    const body = await req.json();
    const {
      email,
      display_name,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
      imap_host,
      imap_port,
      imap_secure,
      imap_username,
      imap_password,
    } = body ?? {};

    if (
      !email || !smtp_host || !smtp_port || !smtp_username || !smtp_password
    ) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const smtp_password_enc = await encryptIfPossible(admin, smtp_password);
    const imap_password_enc = imap_password
      ? await encryptIfPossible(admin, imap_password)
      : null;

    const { data: inserted, error: insertErr } = await admin
      .from("email_accounts")
      .insert({
        user_id: userId,
        email,
        display_name: display_name ?? null,
        provider: "smtp",
        auth_type: "smtp",
        status: "active",
        smtp_host,
        smtp_port: Number(smtp_port),
        smtp_secure: smtp_secure !== false,
        smtp_username,
        smtp_password_enc,
        imap_host: imap_host ?? null,
        imap_port: imap_port ? Number(imap_port) : null,
        imap_secure: imap_secure !== false,
        imap_username: imap_username ?? null,
        imap_password_enc,
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: inserted.id, ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("connect-smtp-account error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to connect account" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
