## Mål
Göra mejl-redigeraren i sekvensbyggaren till en rich text-editor (likt Outlook/Gmail) med formattering, typsnitt, färger och bilder — utan att tappa nuvarande funktionalitet (variabler, AI-förbättring, spam-analys, unsubscribe, link-tracking).

## Vad som är rimligt vs riskabelt

**Rimligt och rekommenderat:**
- **Bold, italic, underline, strikethrough** — universellt stöd i alla mejlklienter.
- **Rubrikstorlekar (H1–H3) + listor (bullet/numrerad)** — bra stöd.
- **Textfärg + bakgrundsfärg** — fungerar i 99% av klienter.
- **Länkar med valfri ankartext** — viktigt eftersom vi auto-taggar dem för tracking.
- **Citatblock** (för "reply"-känsla i uppföljningar).
- **Inline-bilder via uppladdning** — laddas upp till Lovable Cloud Storage och bäddas in som `<img src="https://...public-url">`. Inte CID-bilagor (det kräver MIME multipart/related, krångligt).
- **Variabel-chips** ({{first_name}} osv.) — fortsätter fungera, infogas som vanlig text.

**Möjligt men begränsat — vi avråder från default:**
- **Custom typsnitt** — bara "web safe" fonts (Arial, Helvetica, Georgia, Times, Verdana, Courier). Custom Google Fonts renderas inte i Outlook desktop. Vi exponerar 5–6 säkra val istället för fri lista.
- **Bifogade filer (attachments)** — ökar spam-risk markant och kräver MIME-multipart i SMTP-skickaren. **Vi rekommenderar att skippa detta för cold outreach.** Om det ändå önskas: separat följdsteg.

**Avråder:**
- Tabeller, kolumner, bakgrundsbilder — bryts i Outlook.
- Inbäddade videos — fungerar inte; använd länk + thumbnail.

## Förslag på lösning

### Editor: Tiptap
Tiptap (på ProseMirror) — modernt, headless, React-stöd, små bundles. Vi använder följande extensions:
`StarterKit, Underline, Link, TextStyle, Color, Highlight, FontFamily, Image, Placeholder`.

Toolbar byggs egen (matchar vår design system) — knappar för B/I/U/S, H1–H3, listor, citat, länk, färg, font, bild-uppladdning, infoga variabel.

### Datamodell
Sequence steps lagrar i dag bara `body` (plaintext). Vi byter till att lagra **HTML** i `body` (befintlig kolumn återanvänds; befintlig plaintext är giltig HTML). Vi genererar `body_text` automatiskt vid sändning via en `htmlToText()`-helper — så att multipart/alternative behålls för bra leverans.

Inga DB-migrationer behövs för stegen. Bara en ny storage bucket för bilder.

### Bilduppladdning
- Ny **public** storage bucket `email-images` med RLS som låter inloggade ägare skriva i sin egen mapp `{user_id}/...` och alla läsa.
- Drag/drop eller knapp i toolbaren → uppladdning → infogar `<img>` med publik URL och `style="max-width:100%"`.
- Storleksgräns 2 MB, format jpg/png/webp/gif.

### Sändning (`send-email` + `process-scheduled-sends`)
- `body_html` = renderad HTML från editorn (efter `renderTemplate` och `tagLinksForTracking`).
- `body_text` = autogenererad ren text (för fallback + bättre spam-score).
- Befintlig `tagLinksForTracking` fungerar redan på HTML — inga ändringar krävs där.
- `ensureUnsub` fortsätter lägga till unsub-länk när token saknas.

### AI-förbättring (`improve-step`)
Skickar och tar emot HTML i stället för plain text — uppdaterad prompt: "behåll HTML-strukturen, ändra bara innehållet".

### Spam-analys / kvalitet
`analyzeEmail` får en wrapper som strippar HTML innan analys (ord-räkning, spam-ord, läsbarhet) — UI:t påverkas inte.

### Förhandsvisning (`EmailPreview`)
Renderar HTML via `dangerouslySetInnerHTML` (sanerad) i en `prose`-container så användaren ser exakt vad mottagaren ser.

### Säkerhet
- Sanera HTML både vid spara och vid render med `DOMPurify` — tillåter bara whitelist av taggar/attribut/styles.
- Bilder valideras (mime + storlek) före uppladdning.

## Tekniska delar

**Nya paket:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-font-family`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, `dompurify`, `html-to-text` (eller egen liten helper i edge function).

**Nya filer:**
- `src/components/sequence/RichTextEditor.tsx` — Tiptap-instans + toolbar.
- `src/components/sequence/RichTextToolbar.tsx`
- `src/lib/sanitizeHtml.ts` — DOMPurify-config (whitelist).
- `src/lib/htmlToText.ts` — frontend preview/quality-analys.
- `supabase/functions/_shared/htmlToText.ts` — Deno-version för sändning.
- Migration: skapa bucket `email-images` + RLS policies.

**Ändrade filer:**
- `src/components/sequence/SequenceStepCard.tsx` — byter `<Textarea>` mot `<RichTextEditor>`, behåller variabel-chips (kallar `editor.commands.insertContent('{{first_name}}')`).
- `src/components/sequence/EmailPreview.tsx` — renderar sanerad HTML.
- `src/lib/emailQuality.ts` — strippa HTML innan analys.
- `supabase/functions/send-email/index.ts` — auto-generera `body_text` om bara `body_html` finns.
- `supabase/functions/process-scheduled-sends/index.ts` — skickar `body_html` istället för `body_text`.
- `supabase/functions/improve-step/index.ts` — HTML-medveten prompt.

**Ej ändrat:** DB-schema för sequence_steps, link tracking, unsub-systemet, tracker-script.

## Migrationsplan för befintliga sekvenser
Befintlig plain text i `body` är giltig HTML (radbrytningar konverteras visuellt med `white-space: pre-wrap` i editorns initial-render, sen sparas som riktig HTML vid första edit). Ingen data-migration krävs.

## Vad jag vill bekräfta innan bygge
1. **Bilder: ja eller nej?** (rekommendation: ja för inline, nej för attachments)
2. **Custom fonts:** låsa till 5–6 web-safe, eller exponera fri lista (sämre Outlook-stöd)?
3. **Bifogade filer (attachments):** skippa nu? (rekommenderat)
