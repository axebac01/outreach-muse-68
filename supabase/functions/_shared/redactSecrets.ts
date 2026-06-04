// Strips secret-bearing tokens from strings before persisting them to the DB
// or returning them to clients. Use on every error_message / status_message.
//
// Patterns: "Bearer <jwt-ish>", Authorization headers, refresh_token=...,
// access_token=..., and any long base64url chunks that look like JWTs.

const PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]"],
  [/Authorization:\s*[^\s,;]+/gi, "Authorization: [redacted]"],
  [/(access_token|refresh_token|id_token|client_secret)["'\s:=]+[A-Za-z0-9._\-]+/gi, "$1=[redacted]"],
  [/eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, "[jwt-redacted]"],
  [/sk_(live|test)_[A-Za-z0-9]+/g, "sk_[redacted]"],
];

export function redactSecrets(input: unknown): string {
  if (input == null) return "";
  let s = typeof input === "string" ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();
  for (const [re, repl] of PATTERNS) s = s.replace(re, repl);
  return s;
}
