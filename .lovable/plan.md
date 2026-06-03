## Plan: Lås in krypterade tokens i email_accounts

### Bakgrund
- Vyn `public.email_accounts_safe` finns redan och exponerar bara icke-känsliga kolumner (ingen `*_token_enc` eller `*_password_enc`).
- Klient-koden läser redan från `email_accounts_safe` i `useEmailAccounts.ts`.
- **Problem 1:** SELECT-policyn på `public.email_accounts` släpper fortfarande in inloggad ägare på hela raden (inkl. ciphertext) via PostgREST.
- **Problem 2:** `src/pages/Inbox.tsx` läser fortfarande `from("email_accounts")` (bara `id, email, status` — men ändå råtabellen).
- Edge functions använder `service_role` och påverkas inte alls (`service_role` bypassar RLS och har full grant).

### Ändringar

**1. Migration — låsa SELECT på råtabellen för klienten**
```sql
-- Ta bort klient-SELECT på råtabellen
DROP POLICY IF EXISTS "Users can view own email accounts (safe cols via view)"
  ON public.email_accounts;
REVOKE SELECT ON public.email_accounts FROM authenticated, anon;

-- Säkerställ att vyn är åtkomlig
GRANT SELECT ON public.email_accounts_safe TO authenticated;
```
- INSERT/UPDATE/DELETE-policyerna på `email_accounts` lämnas orörda — de behövs för Connect/Update/Delete från klienten och kräver ingen SELECT-rättighet.
- `service_role` behåller full access → alla edge functions (OAuth-callback, send, sync, IMAP/SMTP, Gmail/Outlook m.fl.) fortsätter fungera oförändrat.

**2. `src/pages/Inbox.tsx`**
- Byt `.from("email_accounts").select("id, email, status")` → `.from("email_accounts_safe").select("id, email, status")`.

### Verifiering efter migration
- Inloggning, Connect Gmail/Outlook, IMAP-inställningar, skicka mejl, sync, inbox-listan, signatur-redigering, radera konto.
- Säkerhetsskanner: markera findingen som fixad.

### Risk
Mycket låg. Vi byter bara läsväg för klienten; all skriv- och edge-function-logik är intakt eftersom service_role bypassar RLS.