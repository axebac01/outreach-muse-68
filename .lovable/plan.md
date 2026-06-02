## Lead Marketplace — MVP-plan

Kunden söker leads från Apollo.io inne i appen, betalar med credits (köpta via Stripe), och importerar valda leads direkt till en sequence. Vi tar ett procentpåslag på Apollos pris.

---

## Hur det hänger ihop

```text
Kund → /leads (sök-UI) → vår edge function → Apollo API
                                ↓
                          (vi cachar preview)
                                ↓
Kund klickar "Köp & importera" → drar credits → Apollo "people/match" (avslöjar e-post)
                                ↓
                          rader i sequence_leads
                                ↓
Slut på credits? → /leads/credits → Stripe Checkout → webhook fyller på
```

---

## Vad som byggs

### 1. Apollo-integration (edge functions)
- **Secret**: `APOLLO_API_KEY` (vi ber dig om den när vi är i build mode).
- **`leads-search`** — proxar Apollo `mixed_people/search` med filter: titel, bransch, land, företagsstorlek, teknik. Returnerar **preview-data** (namn, titel, företag, LinkedIn) — INGEN e-post, INGET direktnummer. Vi vill inte avslöja kontaktdata förrän kunden betalat.
- **`leads-reveal`** — för valda leads: drar credits atomiskt, kallar Apollo `people/match` för att hämta verifierad e-post + telefon, sparar i vår DB, returnerar till klienten.
- **`leads-import`** — tar avslöjade leads och skapar rader i `sequence_leads` för vald sequence.

Alla tre verifierar JWT via `getClaims()` och scopar mot `auth.uid()`.

### 2. Credit-system (databas)
Nya tabeller:
- **`credit_wallets`** — `user_id` (unik), `balance int`, `updated_at`. En per användare.
- **`credit_ledger`** — `user_id`, `delta int` (+/-), `reason` (`'purchase'`, `'reveal'`, `'refund'`, `'grant'`), `lead_id`, `stripe_session_id`, `created_at`. Append-only revisionslogg.
- **`marketplace_leads`** — leads vi köpt åt en kund. `user_id`, `provider` (`'apollo'`), `provider_id`, `email`, `full_name`, `title`, `company`, `linkedin_url`, `phone`, `raw jsonb`, `cost_credits`, `revealed_at`. Unik på `(user_id, provider, provider_id)` så samma kund inte betalar två gånger för samma lead.
- **Funktion `spend_credits(user_id, amount, reason, lead_id)`** — SECURITY DEFINER, atomisk: kollar balance, drar, skriver ledger, kastar fel om otillräckligt. Anropas bara från edge functions.

RLS: kunder kan SELECT sin egen plånbok/ledger/leads. Inga client-writes på `credit_wallets`/`credit_ledger` — bara edge functions via service_role.

### 3. Prissättning & marginal
Konfiguration i en `pricing_config`-tabell (eller hårdkodat först):
- **`apollo_cost_per_reveal_usd`** — t.ex. 0.10 USD (vi mäter mot Apollos faktiska kostnad).
- **`margin_percent`** — t.ex. 30%.
- **`credit_value_sek`** — t.ex. 1 credit = 1 SEK.
- **Resultat**: en reveal kostar kunden ~1.5 credits, vi tjänar ~0.35 SEK/lead.

Visas tydligt i UI: "Avslöja 50 leads — 75 credits".

### 4. Stripe credit-paket
- Kör eligibility-check + `enable_stripe_payments`.
- Skapa 3 paket: 500 / 2 000 / 10 000 credits (volymrabatt på de större).
- **`create-credit-checkout`** edge function — skapar Stripe Checkout Session, lägger `user_id` + `credits` i metadata.
- **`stripe-webhook`** — på `checkout.session.completed`: skriver till `credit_ledger`, ökar `credit_wallets.balance`. Idempotent via `stripe_session_id`.

### 5. UI — ny sida `/leads`
- **Filter-sidopanel**: titel, bransch, land, företagsstorlek, sökord.
- **Resultat-lista**: kort med namn, titel, företag, LinkedIn-länk. Checkboxar för urval.
- **Footer-bar (sticky)**: "X valda · Y credits · [Avslöja & importera till sequence ▾]". Dropdown för att välja sequence.
- **Credit-badge i header**: visar saldo, klick → `/leads/credits` med Stripe-paketen.
- **`/leads/history`**: tidigare köp + revisionslogg.

Realtime: prenumerera på `credit_wallets` så saldot uppdateras direkt efter Stripe-webhook.

### 6. Navigation
Lägg till "Leads" i sidomenyn (mellan Inbound och Inbox typ). Endast inloggade.

---

## Vad som INTE byggs i MVP
- Ingen publikt API för kunder (kan komma som v2 — vi har redan `integration_api_keys`-tabellen).
- Ingen "marketplace" med flera leverantörer — bara Apollo.
- Ingen refund-flow för dåliga leads (om Apollo levererar bounce får vi hantera manuellt först).
- Ingen prenumerations-bundling av credits — separat köp.

---

## Vad jag behöver från dig (när vi går till build mode)
1. **Apollo API-nyckel** — finns i Apollo: Settings → Integrations → API. Jag begär den med `add_secret`.
2. **Bekräftelse på prissättning** — föreslår: 30% marginal, 1 credit = 1 SEK, paket på 500/2000/10000. Säg till om du vill justera.
3. **Stripe** — vi kör eligibility-check och drar igång `enable_stripe_payments`. Du fyller i formuläret som dyker upp.

---

## Verifiering innan klart
- Sök → får resultat utan e-post.
- Reveal med tillräckliga credits → e-post syns, saldo minskar, rad i `marketplace_leads`, rad i `credit_ledger`.
- Reveal utan tillräckliga credits → vänligt fel, ingen debet.
- Köp credits via Stripe test → webhook fyller på saldo, syns i UI inom sekunder.
- Importera till sequence → rader i `sequence_leads`, syns i sequence-vyn.
- Försök reveala samma lead två gånger → ingen dubbeldebitering (unique constraint).
