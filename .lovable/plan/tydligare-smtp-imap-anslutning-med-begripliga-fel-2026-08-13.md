# Tydligare SMTP/IMAP-anslutning med begripliga fel

## Problemet

1. **Felmeddelandet säger ingenting.** När testet misslyckas svarar servern med HTTP 400 och en strukturerad felkod (t.ex. `smtp_auth_failed`), men klienten läser aldrig svarskroppen: `supabase.functions.invoke` kastar ett generiskt fel vid non-2xx och den riktiga koden går förlorad. Resultatet blir reservtexten "SMTP-test misslyckades: {{detail}}" utan värde — därav ": [[detail]]".
2. **SMTP och IMAP testas inte separat.** Testknappen anropar bara `test-smtp`; IMAP-uppgifterna sparas otestade. Är IMAP fel märks det först när inkorgssynken tyst slutar fungera.
3. **"Användarnamn" är oklart.** Fältet är tomt med mejladressen som platshållare, utan förklaring att det nästan alltid är mejladressen (men hos vissa leverantörer ett separat kontonamn).

## Vad som byggs

### 1. Läs det riktiga felet från servern
Lägg till en hjälpfunktion som packar upp svarskroppen ur ett funktionsfel (`error.context` är ett `Response`-objekt) och skickar den strukturerade felkoden vidare till felöversättaren. Används i anslutningsdialogen för både test och sparande.

Effekt: användaren får "Fel användarnamn eller app-lösenord…", "Hittar inte servern (…)", "TLS/SSL-handskakning misslyckades…" i stället för ett tomt meddelande.

### 2. Fel som aldrig visas tomma
Sista utvägen i felöversättaren får aldrig lämna kvar en oifylld platshållare — saknas detaljer visas ren text utan kolon. Reservnyckeln för SMTP byts till en variant utan `{{detail}}`.

### 3. Testa SMTP och IMAP var för sig
- Testknappen kör två kontroller och visar resultatet som två rader med grön bock eller röd varning: "Utgående (SMTP)" och "Inkommande (IMAP)".
- Ny kontroll av IMAP i backend: anslut + logga in med befintlig IMAP-klient, klassificera fel (fel inloggning, hittar inte servern, TLS, timeout) på samma sätt som SMTP.
- IMAP-fel blockerar inte sparandet — kontot kan sparas för utskick, men med tydlig varning att svar/inkorg inte kan läsas förrän IMAP fungerar.

### 4. Tydligare formulär
- Hjälptext under Användarnamn: "Oftast samma som din mejladress. Vissa leverantörer använder ett separat kontonamn — kolla hos din mejlleverantör."
- IMAP-sektionen får en förklarande rad om vad SMTP respektive IMAP används till (skicka vs. läsa svar), och växeln "samma som SMTP" får text om att värdnamnet gissas som `imap.` + din domän — går att ändra manuellt.
- Ett eget användarnamnsfält för IMAP när "samma som SMTP" är avstängt (idag går bara värd, port och lösenord att ange separat).

## Tekniska detaljer

- Ny `supabase/functions/test-imap/index.ts` (JWT-verifiering, SSRF-skydd och felklassificering återanvänds i mönstret från `test-smtp`), byggd på `_shared/imapClient.ts`.
- Bryt ut SSRF-/hostkontrollen och felklassificeringen till `_shared/` så SMTP- och IMAP-funktionerna delar kod.
- Ny hjälpfunktion i `src/lib/errorMessages.ts` som läser `FunctionsHttpError.context` som JSON.
- `src/components/ConnectEmailDialog.tsx`: testresultat per protokoll i state, nya hjälptexter, IMAP-användarnamn.
- Nya i18n-nycklar i `sv.json` och `en.json`.
- Efter ändring deployas `test-smtp` och `test-imap`.
