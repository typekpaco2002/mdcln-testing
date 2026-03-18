# Dev-only reload loop: causes and mitigations

This app uses **Vite + React + React Router + Zustand (persist)**. Reload loops in dev (but not prod) are usually caused by one of the following. Here’s how we handle them.

## 1. Auth redirect before hydration

**Pattern:** Route or component redirects to `/login` (or elsewhere) using `isAuthenticated` before Zustand has rehydrated from `localStorage`. Session is still “empty”, so it redirects; after hydration the same logic runs again and can loop.

**Mitigations:**
- **Route guards** (`ProtectedRoute`, `ProtectedRouteWithOnboarding`, etc.): They use `useHasHydrated()` and return `null` until `hasHydrated` is true. No `<Navigate>` runs before hydration.
- **Root route `/`** (`SelectUserTypePage`): Returns a loading state when `!hasHydrated`; only after hydration do we run the session check (getProfile) and optionally `<Navigate to="/dashboard" />`. No redirect or auth-dependent effect runs before hydration.

## 2. useEffect with bad dependency causing navigation

**Pattern:** `useEffect(() => { navigate('/x'); }, [value])` where `value` changes every render (e.g. new object/array), so the effect runs repeatedly and keeps navigating.

**Mitigations:**
- We avoid navigation in effects whose deps are not stable. Where we do navigate in an effect (e.g. Stripe return handler, AdminLoginPage), dependencies are stable (`location.search`, `searchParams`, `navigate`).
- SelectUserTypePage session check effect depends only on `[isAuthenticated]` and is guarded by `checkedRef` so it runs at most once per “logged in” state.

## 3. React StrictMode (double mount in dev)

**Pattern:** In dev, StrictMode mounts → unmounts → remounts. If auth or router logic runs on each mount and triggers a redirect, you can get a loop.

**Mitigation:** StrictMode is **disabled** in `client/src/main.jsx` so effects run once per mount in dev.

## 4. HMR / WebSocket

**Pattern:** Vite HMR or a failing WebSocket causes the dev server or browser to reload the page.

**Mitigation:** When not on Replit (`REPL_ID` unset), HMR is disabled in `vite.config.ts` (`server.hmr: false`) so no HMR WebSocket is used locally.

## 5. Force-logout / 401 handling

**Pattern:** Every 401 triggers token refresh and then force-logout + redirect to `/login`; with no valid cookie in dev that repeats and can look like a reload loop.

**Mitigation:** On localhost, in `client/src/services/api.js` we do not run token refresh or force-logout on 401; we reject the promise only. `ForceLogoutListener` in App.jsx also no-ops on localhost (no navigate to `/login`).

## 6. Branding / API failure on load

**Pattern:** App fetches branding (or another critical resource) on load; in dev the API/DB might fail and throw, leading to error overlay or reload.

**Mitigation:** Branding is read from local config only (`client/src/config/branding.js`); no branding API call on load.

## 7. Uncaught error → Vite overlay → reload

**Pattern:** An uncaught error in the tree triggers Vite’s error overlay; some setups then reload the page, which can repeat.

**Mitigation:** A top-level error boundary in `client/src/main.jsx` catches errors and shows a simple “Something went wrong” + “Try again” with no `location.reload()`, so Vite does not get an uncaught error.

---

## Quick checks when debugging a reload loop

1. **Network tab:** See which request (if any) happens right before each reload.
2. **Console:** Note any error or warning immediately before the reload.
3. **Cookies (Application tab):** See if a cookie is being set or removed on every request.
4. **Hydration:** Add a temporary `console.log(useAuthStore.persist.hasHydrated())` in the root route; ensure redirects/navigation only run after hydration is true.
