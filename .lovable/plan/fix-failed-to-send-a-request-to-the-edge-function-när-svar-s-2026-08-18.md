# Fix: "Failed to send a request to the edge function" när svar skickas från Unibox

## Vad som händer

Felmeddelandet kommer från webbläsaren innan anropet ens når servern — det är inte AI-förslaget eller själva utskicket som strular.

Unibox skickar svar via `send-email` med en extra header `x-region: eu-central-1` (den vi la till för att undvika Loopias geoblockering). Serverfunktionerna tillåter bara headers `authorization, x-client-info, apikey, content-type` i sitt CORS-svar. Webbläsarens förhandsförfrågan (preflight) blockeras därför och supabase-klienten rapporterar "Failed to send a request to the edge function".

Samma problem gäller alla ställen som skickar `x-region`: Unibox-synk ("Synka"-knappen), test-utskick av kampanjmejl, och SMTP/IMAP-test i anslutningsdialogen.

## Åtgärd

1. Lägg till `x-region` i `Access-Control-Allow-Headers` i den delade CORS-konfigurationen (`supabase/functions/_shared/oauth.ts`) samt i de funktioner som deklarerar egna CORS-headers och tar emot region-headern: `send-email`, `sync-inbox`, `test-smtp`, `test-imap`, `connect-smtp-account`, `check-deliverability`.
2. Distribuera om de berörda funktionerna.
3. Verifiera: öppna tråden i Unibox, skicka AI-förslaget som svar och bekräfta att mejlet går iväg (samt att "Synka"-knappen fungerar).

## Teknisk detalj

Ingen ändring i frontend behövs — `mailRegionHeaders` behålls som den är, eftersom regionpinningen krävs för att Websupport/Loopia inte ska blockera inloggning från fel land.
