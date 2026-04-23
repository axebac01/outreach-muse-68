import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function decryptIfPossible(
  admin: ReturnType<typeof createClient>,
  ciphertext: Uint8Array,
): Promise<string> {
  const key = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!key) {
    return new TextDecoder().decode(ciphertext);
  }
  const { data, error } = await admin.rpc("decrypt_secret", {
    ciphertext,
    key,
  });
  if (error) {
    console.warn("decrypt_secret RPC missing — assuming plaintext", error);
    return new TextDecoder().decode(ciphertext);
  }
  return data as string;
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

    const {
      email_account_id,
      to,
      subject,
      body_html,
      body_text,
      lead_id,
      in_reply_to,
    } = await req.json();

    if (!email_account_id || !to || !subject) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: account, error: accErr } = await admin
      .from("email_accounts")
      .select("*")
      .eq("id", email_account_id)
      .eq("user_id", userId)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (account.auth_type !== "smtp") {
      return new Response(
        JSON.stringify({ error: "Only SMTP accounts supported in this phase" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const password = await decryptIfPossible(admin, account.smtp_password_enc);

    const client = new SMTPClient({
      connection: {
        hostname: account.smtp_host,
        port: account.smtp_port,
        tls: account.smtp_secure !== false,
        auth: {
          username: account.smtp_username,
          password,
        },
      },
    });

    let status = "sent";
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;

    try {
      const result = await client.send({
        from: account.display_name
          ? `${account.display_name} <${account.email}>`
          : account.email,
        to,
        subject,
        content: body_text || "",
        html: body_html || undefined,
        inReplyTo: in_reply_to || undefined,
      });
      providerMessageId = (result as any)?.messageId ?? null;
      await client.close();
    } catch (sendErr: any) {
      status = "failed";
      errorMessage = sendErr?.message || "Send failed";
      try {
        await client.close();
      } catch (_) { /* noop */ }
    }

    await admin.from("email_messages").insert({
      user_id: userId,
      email_account_id,
      lead_id: lead_id ?? null,
      direction: "outbound",
      from_address: account.email,
      to_address: to,
      subject,
      body_text: body_text ?? null,
      body_html: body_html ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      status,
      error_message: errorMessage,
      provider_message_id: providerMessageId,
      in_reply_to: in_reply_to ?? null,
    });

    if (status !== "sent") {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-email error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
