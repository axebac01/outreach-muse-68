# Zoho: "Sender Address Blocked" — hitta den verkliga orsaken

## Vad vi vet

Felet `554 5.1.8 Sender Address Blocked` kommer från Zoho **under inloggningsfasen**, inte när ett mejl skickas — vårt SMTP-test gör bara EHLO + AUTH och skickar aldrig något mejl. Att IMAP fungerar visar att användarnamn och lösenord är korrekta. Det är alltså inte fel lösenord.

Kvarstående troliga orsaker (ej verifierade ännu):

- Fel värdnamn: `smtppro.zoho.eu` gäller betalda Zoho Mail-planer. Gratis-/testkonton ska använda `smtp.zoho.eu`, och gratisplanen tillåter i vissa fall inte extern SMTP alls.
- Kontot/domänen `skaffacrmdata.se` är inte fullt verifierad i Zoho, eller adressen är ett alias snarare än en riktig brevlåda.
- Zoho kräver ett app-specifikt lösenord för SMTP när tvåfaktor är på (IMAP kan vara tillåtet med annan inställning).
- Zoho blockerar utgående från vår IP-region tills kontot är "godkänt" (nya konton spärras ofta första dygnen).

## Vad som ska göras

1. **Visa vilket steg som fallerar.** SMTP-testet får spåra fasen (`greeting`, `ehlo`, `starttls`, `auth`) och returnera den i felsvaret. Då ser vi svart på vitt om Zoho spärrar redan vid anslutning eller först vid AUTH — det avgör vilken av orsakerna ovan det är.
2. **Leverantörsspecifik text för Zoho.** När värdnamnet innehåller `zoho` visas en egen förklaring i stället för den generiska: kontrollera att planen tillåter extern SMTP, prova `smtp.zoho.eu` om `smtppro` inte fungerar (och tvärtom), använd app-lösenord vid tvåfaktor, och verifiera att adressen är en riktig brevlåda.
3. **Automatiskt värdnamnsförslag.** Om testet mot `smtppro.zoho.eu` ger sender-blocked kör testet om mot `smtp.zoho.eu` (port 465) och rapporterar om den varianten fungerar — då kan användaren bara byta värd och spara.
4. **Tydligare resultatrad** i anslutningsdialogen: fasen och den råa serverraden ligger kvar hopfälld under "Visa tekniska detaljer".

## Teknisk omfattning

- `supabase/functions/_shared/smtp.ts`: `verifySmtpLogin` taggar fel med aktuell fas.
- `supabase/functions/test-smtp/index.ts`: returnerar `stage` i felsvaret, provar Zoho-alternativvärden vid sender-blocked, deployas efteråt.
- `src/lib/errorMessages.ts`: värdbaserad nyckel `errors.smtp.senderBlockedZoho`.
- `src/i18n/locales/sv.json` och `en.json`: nya texter.
- `src/components/ConnectEmailDialog.tsx`: visar fas + eventuellt fungerande alternativvärd.

Inga databasändringar.
