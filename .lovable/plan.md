# Fix: "Kontrollera DNS" ger 500

## Vad som är fel

Knappen anropar funktionen `check-deliverability`. Den verifierar inloggning med `supa.auth.getClaims(...)`, men funktionen använder klientbiblioteket i version 2.45.0 där `getClaims` inte finns — därför kraschar den med 500 innan DNS ens kontrolleras.

Övriga funktioner i projektet (t.ex. e-posttest, koppla konto) använder `auth.getUser()` med samma bibliotek och fungerar.

## Åtgärd

I `supabase/functions/check-deliverability/index.ts`:
- Byt inloggningskontrollen från `supa.auth.getClaims(token)` till `supa.auth.getUser()` (klienten skickar redan med Authorization-headern).
- Behåll 401-svaret när token saknas eller är ogiltig, och behåll all befintlig SPF/DKIM/DMARC-logik oförändrad.
- Deploya funktionen på nytt.

## Verifiering

Anropa funktionen med en giltig session och bekräfta 200 med SPF/DKIM/DMARC-resultat, samt att anrop utan token fortfarande ger 401.
