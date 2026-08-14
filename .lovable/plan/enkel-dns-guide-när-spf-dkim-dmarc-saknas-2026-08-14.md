# Enkel DNS-guide när SPF/DKIM/DMARC saknas

Idag säger appen bara "DNS-poster saknas" och namnger vilka. Vi lägger till en konkret steg-för-steg-guide som visar exakt vilken post användaren ska lägga till.

## Kort svar på frågan
Själva DNS-posterna är i praktiken standardiserade:
- **DMARC** är alltid samma format och läggs alltid på `_dmarc.dindomän.se` — här kan vi ge en färdig sträng att kopiera.
- **SPF** beror på vem som skickar mejlen (Google, Microsoft, webbhotell) — vi kan ge rätt värde för de vanligaste och en generisk mall annars.
- **DKIM** är det enda som är unikt per leverantör: nyckeln måste hämtas i leverantörens panel. Där länkar vi till rätt sida i stället för att gissa.

Det som skiljer sig mellan leverantörer är alltså *var* man klistrar in posten (DNS-panelen hos Loopia, One.com, Cloudflare, GoDaddy m.fl.) — det löser vi med en kort lista med länkar till respektive DNS-panel.

## Vad vi bygger
En "Så här fixar du"-knapp i varningsrutan på sidan Mejlkonton som öppnar en dialog med:

1. **Sammanfattning** — domän + vilka poster som saknas.
2. **Ett kort per saknad post** med:
   - Typ (TXT/CNAME), Namn/Host, Värde — i kopieringsbara fält.
   - Kort förklaring på svenska ("DMARC talar om för mottagaren vad som ska hända med mejl som inte klarar kontrollen").
   - DKIM: i stället för värde visas instruktion + länk till leverantörens guide (Google Workspace, Microsoft 365, eget webbhotell).
3. **Var lägger jag in det?** — lista med länkar till DNS-inställningarna hos de vanligaste svenska/internationella leverantörerna (Loopia, One.com, Websupport, Miss Hosting, GoDaddy, Cloudflare, Namecheap) plus text om att det kan ta upp till några timmar innan posten syns.
4. **"Kontrollera igen"-knapp** som kör samma DNS-kontroll som idag och uppdaterar statusen direkt i dialogen.

Rekommenderade värden vi föreslår:
- DMARC (start, säkert läge): `v=DMARC1; p=none; rua=mailto:dmarc@dindomän.se`
- SPF beroende på avsändare: Google `v=spf1 include:_spf.google.com ~all`, Microsoft `v=spf1 include:spf.protection.outlook.com ~all`, annars mall med webbhotellets include.
- Om SPF redan finns men saknar rätt include: visa befintlig post och förklara att man ska lägga till include i den, inte skapa en ny.

## Teknisk plan
- Ny komponent `src/components/email/DnsFixDialog.tsx` — tar `domain`, `provider` och `deliverability_check` och renderar korten. Kopiering via befintlig `CopyButton`.
- Ny datafil `src/lib/dnsGuides.ts` — rekommenderade postvärden per avsändartyp (gmail/outlook/smtp) samt länklista till DNS-panelerna.
- `src/pages/EmailAccounts.tsx`: lägg till knappen "Så här fixar du" i den befintliga varningsrutan (rad ~229) som öppnar dialogen.
- `src/components/DeliverabilityCheck.tsx`: samma knapp när rapporten inte är "good", återanvänder `run()` för omkontroll.
- Texter i `sv.json` och `en.json`. Inga databas- eller backend-ändringar; befintlig `check-deliverability` används oförändrad.
