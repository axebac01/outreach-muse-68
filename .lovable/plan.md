# Granskning: paket A, C och D

## Sammanfattning av allvarsgrad

- 🔴 **3 buggar** — funktion som inte fungerar
- 🟡 **5 förbättringar** — fungerar, men kan göras säkrare/bättre
- 🟢 **3 polish-punkter** — UX/städning

---

## 🔴 Buggar att fixa nu

### 1. Audit-loggen sparar ingenting (D)
`audit_log` har RLS aktiverat och bara en `SELECT`-policy för authenticated. Det finns **ingen `INSERT`-policy**, så `logAudit()` från `src/lib/audit.ts` blockeras av RLS varje gång. Klienten får ett fel som tysts av `try/catch` — användaren märker inget, men loggen är tom.

**Fix:** Lägg till en INSERT-policy som tvingar `user_id = auth.uid()`:
```sql
CREATE POLICY "Users insert own audit entries"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 2. `auth.sign_in` loggas vid varje token-refresh (D)
`AuthContext` loggar på alla `SIGNED_IN`-events. Supabase emitterar `SIGNED_IN` även vid `INITIAL_SESSION` (sidladdning med befintlig session) och i vissa fall vid token-refresh. Resultat: loggen fylls med falska "inloggningar".

**Fix:** Jämför tidigare session-state innan vi loggar — bara logga när vi går från `null` → session, eller använd `event === "SIGNED_IN" && previousSession === null`.

### 3. DSR-submit har ingen anti-abuse (A)
`submit-dsr` är öppen (`verify_jwt = false`) utan honeypot, captcha eller rate-limit. En bot kan på sekunder fylla `dsr_requests`-tabellen med skräp och tvinga manuellt arbete. (Backend rate-limiting är ett känt plattformsgap; vi använder lättviktslösning istället.)

**Fix:** 
- Honeypot-fält i `Dsr.tsx` (ett dolt `<input name="company_website">` som måste vara tomt).
- Server-side check: avvisa om samma `email`+`request_type` skickats senaste 60 sekunderna (`SELECT 1 FROM dsr_requests WHERE … AND created_at > now() - interval '60 seconds'`).

---

## 🟡 Förbättringar

### 4. DSR-flödet är operationellt halvfärdigt (A)
Formuläret lovar svar inom 30 dagar, men:
- Ingen notifiering skickas till `privacy@maillead.io` när en förfrågan kommer in.
- Ingen admin-vy för att se/behandla `dsr_requests`.
- `dsr.submitted` finns som event-typ i `audit.ts` men anropas aldrig.

**Fix:** Skicka mejl via en transaktionell endpoint till `LEGAL.privacyEmail` i `submit-dsr` (eller använd Resend-connector senare). Logga `dsr.submitted` i `audit_log` med service-role från edge-funktionen.

### 5. `check-deliverability` har ingen JWT-validering (C)
Funktionen tar fritt `domain`-input och slår DNS. Inget gating mot inloggad användare → vem som helst kan använda er Supabase-projekt som DNS-proxy.

**Fix:** Lägg till `getClaims()`-validering i början av funktionen (samma mönster som `send-email`).

### 6. `process-scheduled-sends` batch-storlek 50 (C)
Vid t.ex. 5 konton × cap 100/dag = 500 mejl/dag. Cron körs 1 gång/min × 50 = 3 000 kapacitet/dag — fungerar, men marginalen krymper med fler konton. Värt att höja `MAX_BATCH` till 200 eller paginera.

### 7. Duplicerad cap-logik i frontend och edge function (C)
`providerCap`/`effectiveCap` finns i både `src/hooks/useSendingLimits.ts` och `supabase/functions/process-scheduled-sends/index.ts`. Kommentar varnar för drift men inget hindrar det.

**Fix:** Lägg den enda källan i `supabase/functions/_shared/sendingCaps.ts` och re-exportera värdena (eller behåll men lägg en vitest som låser värden mellan båda).

### 8. `logAudit` gör onödig nätverksrundtur (D)
Anropet `supabase.auth.getUser()` slår mot servern varje gång. Vi har redan `session.user.id` i AuthContext.

**Fix:** Låt `logAudit` ta emot `userId` som parameter, eller läs synkront från `supabase.auth.getSession()` (cachad).

### 9. `metadata as never`-cast i `audit.ts` (D)
Hack från när types inte var regenererade. Nu finns `audit_log` i types — ta bort casten och skriv ren TS.

---

## 🟢 Polish

### 10. SecurityLog saknar app-chrome (D)
`/settings/security` renderas utan `Layout` → ingen Navbar, ingen väg tillbaka utan webbläsarens back-knapp. Wrappa i `<Layout>` och lägg en länk till "Säkerhet" i Settings-sidans navigation.

### 11. Footer visas inte på Landing/Pricing (A)
`Footer` är inlagd i `Layout`, men `Landing.tsx` och `Pricing.tsx` använder inte `Layout`. Footern (med länkar till privacy/terms/cookies) syns alltså inte på de mest publika sidorna — exakt där den behövs för konvertering och juridisk synlighet.

**Fix:** Antingen wrappa Landing/Pricing i Layout, eller rendera `<Footer />` direkt i dem.

### 12. `LEGAL.orgNumber` och adress är placeholders (A)
`"—"` och `"Stockholm, Sverige"` finns kvar. Privacy policy och ToS är inte fullt giltiga juridiskt utan riktigt orgnr + adress. Detta är dokumenterat som TODO men måste fyllas i innan publicering.

---

## Förslag på ordning att fixa

1. Bug #1 (RLS för audit_log) + #2 (sign_in-noise) + #9 (typ-städning) — en migration + två små diff:ar
2. Bug #3 (DSR honeypot/rate-limit) + #4 (DSR-notifiering + audit-event)
3. Förbättring #5 (JWT på check-deliverability) — en-rad-fix
4. Polish #10 + #11 (Layout/Footer-konsekvens)
5. #6, #7, #8, #12 — när det passar

Vill du att jag kör 1–3 nu (kritiska säkerhets/funktions-buggar) och lämnar polish till senare, eller hela listan i en sittning?
