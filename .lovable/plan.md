## Problem

Subject "[TEST] idé för TEST" arrived as `[TEST] idÃƒÂ© fÃƒÂ¶r TEST`. The body (which has an explicit `Content-Type: ...; charset="UTF-8"`) renders fine — only the subject is broken.

Cause: in `supabase/functions/send-email/index.ts`, `buildRfc2822()` writes the Subject header as raw UTF-8 bytes:

```
Subject: ${opts.subject}
```

Email headers are 7-bit ASCII by definition. Non-ASCII bytes in headers must be wrapped in an RFC 2047 "encoded-word", e.g. `=?UTF-8?B?aWTDqSBmw7ZyIFRFU1Q=?=`. Without that, Gmail/Outlook treat the bytes as Latin-1, then re-encode them as UTF-8 down the chain, producing the classic double-mojibake "ÃƒÂ©" / "ÃƒÂ¶" pattern.

The same issue affects the display name in the `From:` header when the user's `sender_name` contains non-ASCII (å, ä, ö, é, …).

## Fix

In `supabase/functions/send-email/index.ts`:

1. Add a small helper:
   ```ts
   function encodeMimeWord(s: string): string {
     // ASCII-only? leave as-is
     // eslint-disable-next-line no-control-regex
     if (/^[\x00-\x7F]*$/.test(s)) return s;
     const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(s)));
     return `=?UTF-8?B?${b64}?=`;
   }
   function encodeAddress(addr: string): string {
     // "Name <email>" → encode only Name
     const m = addr.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
     if (m) return `${encodeMimeWord(m[1])} <${m[2]}>`;
     return addr;
   }
   ```

2. In `buildRfc2822`, encode the Subject and From:
   ```ts
   `From: ${encodeAddress(opts.from)}`,
   `To: ${opts.to}`,
   `Subject: ${encodeMimeWord(opts.subject)}`,
   ```
   (Gmail path goes through `buildRfc2822` → already covered.)

3. SMTP path (`denomailer`) — denomailer is supposed to encode headers itself, but it has known gaps. To be safe, pass an already-encoded subject:
   ```ts
   subject: encodeMimeWord(subject),
   from: encodeAddress(fromAddr),
   ```

4. Outlook (Graph API) path — JSON, no change needed; Graph handles UTF-8 natively.

5. Strip the `[TEST] ` prefix added in `SendTestEmailDialog` so it isn't double-encoded inside the encoded-word? Not needed — `[TEST] ` is ASCII; only the non-ASCII suffix gets base64-wrapped. Encoded-words can be mixed with ASCII text in the same Subject line.

## Files to change

- `supabase/functions/send-email/index.ts` — add helpers, wrap Subject + From for Gmail (`buildRfc2822`) and SMTP send.

No DB / frontend changes.

## Verification

After deploy: re-send the same test ("idé för TEST"). Subject should arrive intact in Gmail and any SMTP inbox. Existing ASCII-only subjects are unchanged (helper is a no-op for ASCII).
