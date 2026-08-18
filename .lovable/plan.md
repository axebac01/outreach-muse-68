# Lås all mejltrafik till en region (Frankfurt)

## Varför roterar det idag?

Utskicken körs på Lovable Clouds edge-plattform, som kör samma funktion i flera datacenter runt om i Europa och väljer det som är närmast/ledigt just då. Det är inget vi har valt — det är standardbeteendet. Resultatet är att Websupport ser inloggningar på samma mejlkonto från DE, FR och IE inom några minuter och slår på kapningsskyddet.

Alternativ 3 går faktiskt att göra, men i en enklare form än en egen proxy: vi behöver inte en fast IP-adress, bara ett fast **land**. Plattformen stödjer att man pekar ut vilken region en funktion ska köra i vid varje anrop. Om allt som pratar SMTP/IMAP tvingas till Frankfurt ser Websupport bara tyskt trafik och geoblocket triggas inte.

En riktig proxy med statisk IP (extern betaltjänst) hade gett en enda IP istället för ett land — men det kostar pengar, lägger till en ytterligare felkälla och behövs troligen inte, eftersom Websupports spärr reagerar på land, inte på IP.

## Vad som ska göras

1. **Cron-jobben** som driver utskick och inkorgssynk (`process-scheduled-sends`, `sync-inbox-cron`) uppdateras så att anropen skickar en regionflagga för Frankfurt.
2. **Anrop från appen** som leder till SMTP/IMAP-inloggning får samma regionflagga: testutskick, manuellt svar från inkorgen, "Testa anslutning" för SMTP/IMAP och manuell inkorgssynk.
3. **Verifiering**: kör en ny testomgång på testkampanjen och kontrollera i funktionsloggarna att alla körningar landar i samma region och att inga `551 Blocking access`-fel dyker upp.

## Teknisk detalj

- Regionstyrning sker med `x-region: eu-central-1` som header på funktionsanropet.
- Cron-jobben ligger som `net.http_post`-anrop i databasen; deras header-JSON uppdateras via en migration (schemalägg om jobben med samma cron-uttryck).
- Frontend: lägg till `headers: { "x-region": "eu-central-1" }` i `supabase.functions.invoke` för `send-email`, `test-smtp`, `test-imap` och `sync-inbox` (`SendTestEmailDialog.tsx`, `Inbox.tsx`, `ConnectEmailDialog.tsx`, `ProviderConnectGuide.tsx`).
- Om Frankfurt är otillgängligt faller plattformen tillbaka till annan region. Det är sällsynt, men vi loggar vilken region körningen skedde i så att ett återkommande `551` går att härleda direkt istället för att gissa.

## Kvarstående risk

Detta tar bort orsaken till landbytet, men Websupport kan fortfarande ha kvar en aktiv spärr på kontot sedan tidigare försök. Om felet återkommer direkt efter ändringen behöver spärren nollställas av deras support — och då står valet fortfarande mellan att be dem stänga av skyddet eller att flytta utskicken till en dedikerad utskicksleverantör.
