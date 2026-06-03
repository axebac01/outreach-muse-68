# Kritisk riskgenomgång: "Stoppa sekvens när lead svarar"

## Hur flödet fungerar idag

```text
Inkommande mejl
   └─ sync-inbox (per user, OAuth)            ← körs via sync-inbox-cron var 10:e min
        └─ persistInbound()
             ├─ matcha lead via In-Reply-To/References → sequence_leads
             ├─ fallback: matcha via from-adress
             └─ om sequenceId hittas OCH sequences.pause_on_reply = true:
                  ├─ sequence_leads.status = 'replied'
                  └─ cancelScheduledForLead() → scheduled_sends.status = 'cancelled'

process-scheduled-sends (var minut, batch 50)
   └─ för varje "due" rad:
        └─ läser sequence_leads.status; om replied/unsubscribed/bounced/completed
           → cancelled (sista skyddet innan send-email anropas)
```

Det finns alltså **två lager**: sync-inbox cancellar proaktivt, process-scheduled-sends har en sista check. Bra grund — men flera tysta felägen finns.

## Identifierade risker (prioriterat)

### P0 — kan leda till att mejl skickas efter svar

1. **IMAP/SMTP-konton synkas inte alls.** `sync-inbox-cron` filtrerar `auth_type IN ('oauth')` och `sync-inbox` läser bara Gmail/Outlook API. Lead som svarar till ett SMTP/IMAP-konto upptäcks aldrig → uppföljningsmejl fortsätter skickas. Katastrofläge om vi släpper SMTP till riktiga användare.

2. **Reply-matchningen kräver att vi hittar `sequenceId`.** Pause körs bara i `if (sequenceId)`-blocket. Om mottagaren svarar:
   - från **annan adress** än den vi mejlade till (vanligt: alias, vidarebefordran, "reply-to" på annat konto), OCH
   - utan korrekt `In-Reply-To`/`References`-header (Outlook-trådning, mobilappar som bryter headers),
   
   då sätts varken `leadId` eller `sequenceId`, och pausen körs inte. `sequence_leads.status = 'replied'` skrivs heller inte → process-scheduled-sends fortsätter skicka.

3. **Cron-fönster på 10 min + Gmail historyId.** Om sync-inbox-cron failar eller hoppar över ett konto (fel i refresh-token, 429, timeout) hinner nästa uppföljning gå ut innan svaret syns. Vi har inte automatisk re-try eller alerting på misslyckade syncar idag.

4. **Race condition mellan sync-inbox och process-scheduled-sends.** Båda kan köra samtidigt. process-scheduled-sends läser `sequence_leads.status` i början av varje rad-iteration — om svaret landar i samma sekund som send-email anropas kan vi skicka.
   - Mildring: send-email-callet är sista steget, men det finns inget lås på `scheduled_sends`-raden mellan check och send → samma rad kan teoretiskt plockas två gånger om en framtida andra worker startas.

5. **`pause_on_reply` är en användarinställning som default = true, men kan stängas av.** Om en användare oavsiktligt avmarkerar den slutar reply-stopp fungera helt. Inget UI-skydd / varning.

6. **Lead-matchning på email är `ilike`** — bra. Men om leadens adress lagras med whitespace eller `+tag` så missar matchningen. Vi normaliserar inte `email` i `sequence_leads`/`marketplace_leads` vid insert.

### P1 — degradering, inte direkt skada

7. **Auto-reply / OOO-mejl ("Jag är på semester") räknas som svar** och pausar sekvensen permanent. Symmetrisk risk: att vi *inte* skickar när vi borde. Användaren tror leadet är engagerat.

8. **Bounce-detektion är heuristik på subject/from.** Soft bounces, ovanliga MTA-format eller icke-engelska bounce-mejl missas → mejl fortsätter mot död adress (skadar deliverability, inte direkt reply-buggen, men samma cancel-väg).

9. **Ingen synlig "varför pausades detta"-logg.** Om något går fel finns inget audit-spår per scheduled_sends-rad (vi har bara `status` + `error_message`). Svårt att felsöka i produktion.

10. **`scheduled_sends` har ingen `cancelled_reason`-kolumn.** Vi kan inte i efterhand bevisa varför ett mejl inte skickades — viktigt för supportärenden ("varför fick min lead 3 mejl efter att hen svarat?").

### P2 — operativ risk

11. **Inga health-checks/alerts.** Vi vet inte om sync-inbox-cron slutat köra, om en användares OAuth-token gått ut, eller om `pause_on_reply` orsakat 0 cancels på en aktiv sekvens.

12. **Inga tester.** Inget integrationstest som verifierar "svar → uppföljning skickas ej".

## Förslag på skyddsåtgärder (innan launch)

Jag föreslår vi gör dessa i ordning. Vi behöver inte allt, men P0-listan är skarp:

**Måste (P0):**
- **A. IMAP-sync för SMTP-konton.** Antingen bygg IMAP-puller i sync-inbox, eller blockera launch för SMTP-konton tills det finns. Minst: visa tydlig varning vid SMTP-onboarding "vi kan inte detektera svar än".
- **B. Stärk reply-matchning.** Lägg till tredje fallback: matcha inbound `from`-adress mot *alla* aktiva `sequence_leads` (oavsett om vi hittade sequenceId via headers). Om träff → pausa den specifika sekvensen för det leadet.
- **C. Lås `pause_on_reply` till alltid `true`** för v1, eller gör inställningen till en advanced-toggle med varning. Default ska skydda användaren.
- **D. Sista-mils-skydd i `send-email`:** innan SMTP-anropet, gör en `select status from sequence_leads where id=$1` och avbryt om replied/unsubscribed/bounced. Eliminerar race i p4 helt.

**Bör (P1):**
- **E. Audit-kolumn:** `scheduled_sends.cancelled_reason` + skriv värde (`'reply_detected'`, `'bounce'`, `'unsubscribe'`, `'sequence_paused'`, `'lead_status'`). För felsökning.
- **F. Auto-reply-detektion:** skippa pause om inbound har `Auto-Submitted: auto-replied` eller `X-Autoreply` header. Logga som "auto_reply_ignored".
- **G. Normalisera email vid insert** (trim + lowercase) i `sequence_leads` + index på `lower(email)`.

**Operativt (P2):**
- **H. Heartbeat-tabell** för sync-inbox-cron: skriv last_run + per-konto last_success. UI som varnar användaren om deras inbox-sync inte körts på >30 min.
- **I. Ett integrationstest** (Deno test eller liknande) som riggar en lead, ett scheduled_send och en inbound och verifierar att raden blir `cancelled`.

## Teknisk detalj — minsta skarpa fix (om vi vill börja smalt)

Om vi bara gör tre saker före launch:

1. **D + E:** Sista-mils-check i `send-email` + `cancelled_reason`-kolumn. Liten kodändring, eliminerar race och ger oss spårbarhet.
2. **B:** Utöka `persistInbound` så att om vi hittar `leadId` men inte `sequenceId`, hämta lead → hitta alla aktiva sekvenser där den finns → pausa.
3. **A:** Block-knapp eller varningsbanner för SMTP-konton tills IMAP-sync finns.

## Vad jag INTE föreslår nu

- Realtime/webhook-baserad inbox-sync (Gmail watch, Graph subscriptions). Större bygge — kan komma post-launch.
- Distribuerad lås på scheduled_sends. Inte behövd om vi bara har en cron-worker.

---

Vill du att jag bygger någon delmängd av detta? Föreslår att starta med **D + E + B** i en första PR (snabbt, hög skyddseffekt), och separat ta beslut om SMTP-blockering/IMAP-sync (A) eftersom det påverkar produktscope.
