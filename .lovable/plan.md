# Sprint 4B — Mobil-audit

Mål: alla huvudvyer ska vara fullt användbara på 375×812 (iPhone) och 768×1024 (iPad).

## Sidor att auditera
1. `/dashboard`
2. `/leads` (+ lead-detalj)
3. `/sequences` (lista + `SequenceEditor`)
4. `/inbox` (`InboxThreadList` + `InboxThreadView`)
5. `/settings` (konton, domäner, profil)
6. `Layout` (sidebar/topbar, ReconnectBanner)

## Process per sida
1. Öppna i preview på 375×812 → screenshot
2. Notera problem: overflow, klippt text, otillgängliga knappar, sidebar-krock, tabeller som spiller
3. Fixa med Tailwind responsive-klasser (mobile-first, `md:` för desktop)
4. Verifiera på 375 och 768

## Förväntade fixes
- **Layout/Sidebar:** sidebar → off-canvas drawer under `md`, hamburger-trigger i topbar
- **SequenceEditor:** sido-vid-sido steg-lista + editor → staplad vertikalt under `md`, kollapsbar steg-lista
- **InboxThreadList + InboxThreadView:** master-detail → en vy åt gången på mobil (lista, klick → tråd, back-knapp)
- **Tabeller (`/leads`, `/sequences`):** horisontell scroll eller card-layout under `md`
- **Dialoger/Sheets:** se till att `max-h` + scroll fungerar på låg höjd
- **ReconnectBanner:** text wrap, knapp full-width på mobil
- **Settings-formulär:** input-grupper 1-kolumn under `md`

## Leverans
- Endast frontend-ändringar (Tailwind-klasser + ev. en `useIsMobile`-hook där master-detail krävs)
- Ingen schema-/backend-ändring
- Slutrapport: lista över vad som auditerades, vad som fixades, eventuella kvarstående mindre kosmetiska saker

## Inte i scope
- Onboarding-checklista (E)
- "Mark as not bounced"-knapp
- Nya features eller redesign av desktop-vyn
