# Redirecta inloggade användare bort från publika sidor

## Problem
När en inloggad användare besöker `/` (landningssidan), `/login` eller `/signup` visas dessa sidor ändå. Navbaren visar "Logga ut" eftersom sessionen finns — men man hamnar i fel kontext (publik sida med inloggad header).

## Lösning
Skapa en `PublicOnlyRoute`-wrapper som speglar `ProtectedRoute`: om användaren är inloggad → redirect till `/dashboard`. Annars rendera barnen normalt.

Wrappa `/`, `/login` och `/signup` med den. `/pricing` lämnas öppen (inloggade ska kunna se prisplanen).

### Ändringar

1. **Ny fil `src/components/PublicOnlyRoute.tsx`**
   - Använder `useAuth()`. 
   - Medan `loading` är true: rendera ingenting (eller en lätt spinner) så vi inte flashar fel UI.
   - Om `user` finns: `<Navigate to="/dashboard" replace />`.
   - Annars: rendera `children`.

2. **`src/App.tsx`**
   - Wrappa `Landing`, `Login`, `Signup` i `<PublicOnlyRoute>`.

### Inte i scope
- `/pricing` förblir publik (inloggade ska kunna besöka den).
- `/oauth/callback` förblir publik (krävs för OAuth-redirect).
- Navbar-logiken ändras inte — den blir korrekt automatiskt eftersom inloggade aldrig längre är på `/`.

## Verifiering
1. Logga in, gå manuellt till `/` → redirectas direkt till `/dashboard`.
2. Logga in, gå till `/login` eller `/signup` → redirectas till `/dashboard`.
3. Logga ut → `/` visar landningssidan med "Logga in"/"Registrera dig" i navbaren.
