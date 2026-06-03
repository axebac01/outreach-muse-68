## Plan: Markera security finding som fixad

### Bakgrund
Findingen `email_accounts_encrypted_tokens_client_readable` är redan åtgärdad i en tidigare migration:
- SELECT-policyn på `public.email_accounts` är borttagen
- `SELECT` är återkallad från `authenticated` och `anon` på råtabellen
- Klienten läser från vyn `email_accounts_safe` (både `useEmailAccounts.ts` och `Inbox.tsx`)
- Edge functions använder `service_role` och påverkas inte

Schemat bekräftar detta: tabellen `email_accounts` har inga SELECT-policies kvar ("Currently users can't SELECT records from the table"). Scannerns rapport är en äldre cachad bild.

### Åtgärd
1. Anropa `security--manage_security_finding` med `mark_as_fixed` för `email_accounts_encrypted_tokens_client_readable` (scanner: `supabase_lov`), med förklaring om vad som gjordes.
2. Uppdatera security memory så att framtida scans inte återrapporterar samma sak.

### Ingen kodändring behövs
Inga filer eller migrations skrivs — fixet är redan på plats.
