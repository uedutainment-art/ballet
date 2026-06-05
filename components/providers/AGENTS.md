<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-21 | Updated: 2026-05-21 -->

# components/providers

## Purpose
App-level React context providers. Currently only AuthProvider — wraps the
admin tree, exposes the Firebase Auth user + the Firestore `users/{uid}`
document (role, displayName, etc.) via `useAuth()`.

## Key Files
| File | Description |
|------|-------------|
| `AuthProvider.tsx` | Subscribes to `onAuthStateChanged`. On user, fetches `users/{uid}` doc once. Exposes `{ user, userDoc, loading }` via `useAuth()`. Used by every admin page. |

## For AI Agents

### Working In This Directory
- **Must be `"use client"`** — `onAuthStateChanged` only runs in the browser
- **Wrap `<AuthProvider>` once** — typically at `app/admin/layout.tsx`. Don't
  wrap public pages (they don't need auth state and SSR fails on it).
- **userDoc fetched once per uid** — if you change a user's role in Firestore
  you need a fresh sign-in (or wire `onSnapshot` in this provider) to see it
- **No loading flicker** — every admin page should branch on
  `loading ? (...) : !user ? redirect(login) : <Page />`

### Testing Requirements
- Sign in / sign out flows: confirm `userDoc.role` matches Firestore
- Role demotion: sign out + sign in again to refresh

### Common Patterns
```tsx
const { user, userDoc, loading } = useAuth();
if (loading) return <Loading />;
if (!user) { router.replace("/admin/login"); return null; }
if (!isAdminOrAbove(userDoc?.role)) { router.replace("/403"); return null; }
```

## Dependencies

### Internal
- `@/lib/firebase/client` for the Auth instance
- `@/lib/types/user` for `UserDoc` + role guards

### External
- `firebase/auth` (web SDK) — `onAuthStateChanged`

<!-- MANUAL: -->
