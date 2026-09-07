# Bisdata: Generationsskifte 2

## Vad jag hittade i din nya fil

- Filen innehåller 700 rader personer, varav **278 unika e-postadresser** (resten saknar adress och kan inte mejlas).
- Alla 278 är märkta "verified" med högsta säkerhet, alla har förnamn, och de fördelar sig på 246 olika företagsdomäner.
- 152 av dem är funktionsadresser (info@, kontakt@ osv.) och 126 är personliga. Funktionsadresser levererar oftast bra men svarar mer sällan.
- Inga uppenbara påhittade adresser av den typ som sänkte förra kampanjen.

## Avstämning mot förra kampanjen

I "Bisdata: Generationsskifte" hann 41 unika adresser faktiskt få mejl. Jag har jämfört dem mot den nya listan:

- **0 överlapp** på adressnivå.
- **0 överlapp** ens på företagsdomän.

Ingen som redan blivit kontaktad finns alltså med i den nya listan. Dubbelspärren byggs ändå in i importen som säkerhet.

## Vad jag gör

1. Skapar kampanjen **Bisdata: Generationsskifte 2** med samma inställningar som föregångaren: Stockholmstid, utskick måndag–fredag, 25 mejl per konto och dag.
2. Kopierar över de tre mejlstegen ordagrant, med samma väntetider (0, 4 och 7 dagar).
   - Ett fel rättas: sista mejlet hälsar med `{{förnamn}}`, vilket inte är ett fält som finns — det hade blivit en tom eller trasig hälsning. Det byts till `{{first_name}}` precis som i de två första mejlen.
3. Kopplar samma avsändarkonton: kevin@ och oskar@bisdata-kampanj.se.
   - oskar@ är just nu automatpausad efter studsarna i förra kampanjen. Den återaktiveras i samma steg, annars skickar bara kevin@.
4. Importerar de 278 adresserna, med bortfiltrering av allt som redan mejlats i förra kampanjen (i praktiken 0 rader) samt av eventuella avregistrerade adresser.
5. Lämnar kampanjen i utkastläge så att du själv läser igenom och trycker på start.

Förra kampanjen rörs inte — den ligger kvar pausad som den är.

## Teknisk detalj

- Ny rad i `campaigns` (sekvens skapas automatiskt av trigger), sedan `sequence_steps`, `sequence_senders` och `sequence_leads` via databasen.
- Import sker med samma kvalitetsklassning som `emailAddressQuality` gör vid CSV-import; allt som klassas `invalid` kommer inte in.
- `email_accounts` för oskar@ sätts till `active` med rensad `paused_reason`; den befintliga triggern återarmerar då inga sändningar i den nya kampanjen eftersom inga är schemalagda ännu.
- Ingen kodändring behövs utöver detta — allt är data.
