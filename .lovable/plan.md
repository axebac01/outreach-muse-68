# Återstarta Bisdata: Kommunernas egna bolag efter auto-paus

## Vad som hände
Kampanjen auto-pausades 25 sep kl 14:50 efter 34 utskick: 3 hårda studsar (9 %, gräns 8 %). Adresserna sergei.sorokin@kinda.se, daniel.lindqvist@sigtuna.se och ulf.svensson@varnamo.se finns inte hos mottagarna. Skyddet fungerade som avsett.

## Åtgärder
1. Markera de 3 studsade adresserna som ogiltiga i kampanjen (deras köade uppföljningsmejl avbryts automatiskt av befintlig trigger).
2. Kontrollera övriga ~120 leads mot kvalitetsreglerna (samma filter som vid import) och markera eventuella skräpadresser som ogiltiga innan omstart.
3. Nollställ pausorsaken och sätt kampanjen till aktiv igen så utskicken fortsätter från kön (118 schemalagda kvar).

## Teknisk detalj
- `sequence_leads`: status `invalid` för de 3 adresserna + ev. fynd från `emailAddressQuality`-klassning (körs via SQL med samma regler).
- `sequences`: `paused_reason = null`, `paused_at = null`, `status = 'active'` för sekvens 66610c95-dc28-4555-b0a2-93bb2f190627.
- Ingen kodändring — auto-pausen gör rätt jobb.
