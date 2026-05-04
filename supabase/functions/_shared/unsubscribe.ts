// Shared unsubscribe token helpers (Deno edge function context)

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("EMAIL_TOKEN_ENCRYPTION_KEY");
  if (!secret) throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY missing");
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signUnsubscribeToken(
  userId: string,
  email: string,
): Promise<string> {
  const payload = `${userId}|${email.toLowerCase()}`;
  const payloadB64 = b64url(enc.encode(payload));
  const key = await hmacKey();
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64)),
  );
  return `${payloadB64}.${b64url(sig)}`;
}

export async function verifyUnsubscribeToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      enc.encode(payloadB64),
    );
    if (!ok) return null;
    const payload = new TextDecoder().decode(b64urlDecode(payloadB64));
    const [userId, email] = payload.split("|");
    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(token: string): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  return `${base}/functions/v1/unsubscribe?t=${encodeURIComponent(token)}`;
}
