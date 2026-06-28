# CLAUDE.md — Loan Recovery App

## Project

Next.js 15 SSR **PWA** for HDC Coop Bank field officers to search loans and tag GPS locations. Installable on Android/iOS home screen. **Requires network to function** — offline mode is not supported; the app shows an online/offline indicator only. Phase 1 only — see `docs/phase1-ssr.md` for the full spec.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Shadcn/ui · pnpm  
**Backend:** CollectorX REST API at `API_BASE_URL`

## Commands

```bash
pnpm dev          # development server (localhost:3000)
pnpm build        # production build
pnpm start        # serve production build
pnpm lint         # ESLint
```

## Architecture

**SSR-first.** All data fetching happens in Server Components at request time. The only `"use client"` components are those that need browser APIs (geolocation, Google Maps, PWA events) or controlled form inputs.

**URL-driven dashboard state.** Loan search results are driven by query params:
```
/dashboard?BankCode=001&LoanType=PL&LoanCode=00000028
```
The server reads params → fetches loan → renders inline. No client-side fetching for loan data.

**Auth flow:** `LoginForm` (client) → `loginAction` (Server Action) → POST `API_BASE_URL/login` → sign JWT (jose, HS256, 24h) → set HttpOnly `auth-token` cookie → redirect `/dashboard`. The CollectorX `token` is embedded in the JWT as `authToken` and forwarded as `Bearer` on all proxy calls.

**Logout:** `logoutAction` (Server Action) → `clearAuthCookie()` → redirect `/login`.

## Key Files

| File | Purpose |
|---|---|
| `middleware.ts` | JWT validation + route protection on every request |
| `lib/jwt.ts` | `createJWT`, `verifyJWT`, `setAuthCookie`, `getSession`, `clearAuthCookie` |
| `app/actions/auth-actions.ts` | `loginAction`, `logoutAction` Server Actions |
| `app/layout.tsx` | Root layout — PWA metadata, manifest link, viewport, fonts |
| `app/login/page.tsx` | Server Component — fetches branches, renders `<LoginForm>` |
| `app/dashboard/page.tsx` | Server Component — fetches loan types + loan data, inline result |
| `app/loans/[bankCode]-[loanType]-[loanCode]/tag/page.tsx` | Server Component — fetches loan + branch name, renders tagging screen |
| `components/login-form.tsx` | `"use client"` — branch select + credentials + `useActionState` |
| `components/loan-search-form.tsx` | `"use client"` — 3 inputs, navigates via `router.push` with URL params |
| `components/loan-info-card.tsx` | Server Component — read-only loan details display |
| `components/dashboard-header.tsx` | `"use client"` — user info, logout button (calls `logoutAction`) |
| `components/google-map.tsx` | `"use client"` — Google Maps, geolocation, 25m proximity check, tag button |
| `components/network-status-indicator.tsx` | `"use client"` — online/offline badge in header |
| `components/pwa-install-prompt.tsx` | `"use client"` — intercepts `beforeinstallprompt`, shows install banner |
| `components/pwa-initializer.tsx` | `"use client"` — registers `/sw.js` service worker on mount |
| `app/api/loan-location/route.ts` | PUT proxy — called by `GoogleMapComponent` to update GPS on CollectorX |
| `public/manifest.json` | Web App Manifest — name, icons, `display: standalone`, theme colour |
| `public/sw.js` | Service Worker — caches app shell, serves `/offline` when network fails |
| `public/icon-192x192.png` | PWA icon (home screen, splash screen) |
| `public/icon-512x512.png` | PWA icon (large / maskable) |

## Environment Variables

```env
NEXTAUTH_SECRET=                     # JWT signing secret (openssl rand -base64 32)
API_BASE_URL=                        # CollectorX backend (e.g. http://localhost:5106)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=     # Google Maps JS API key
```

## CollectorX API Endpoints Used

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/branches` | None | Branch list for login dropdown |
| POST | `/login` | None | Authenticate user |
| GET | `/loan-type` | Bearer | Active loan types for search dropdown |
| GET | `/loan?BankCode=&LoanType=&LoanCode=` | Bearer | Fetch single loan |
| PUT | `/loan-location` | Bearer | Update GPS coordinates |

## User Roles

| Role | `userType` | `bankCode` | Dashboard behaviour |
|---|---|---|---|
| Head Office | `"Admin"` | `"000"` | Bank code input is editable — can search any branch |
| Branch Officer | `"General User"` | e.g. `"012"` | Bank code input is locked to their own branch |

Derived from CollectorX login response: `role === 1` → `"Admin"`, else `"General User"`.

## PWA

**Manifest** (`public/manifest.json`):
```json
{
  "name": "HDC Loan Recovery",
  "short_name": "LoanRecovery",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#FFD700",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**Service Worker** (`public/sw.js`): minimal — required by browsers for the PWA install prompt only. No caching, no offline handling. All requests go to the network as normal.

**Middleware matcher** must exclude PWA static files:
```ts
matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)']
```

**Install flow:** `PwaInstallPrompt` captures `beforeinstallprompt` → shows a banner → user taps "Install" → `prompt()` called → app added to home screen.

**Network indicator:** `NetworkStatusIndicator` listens to `window` `online`/`offline` events and shows a badge in `DashboardHeader`. Informational only — the app does not function offline.

## Critical Notes

- **`loanAddressLang` not `loanAddressLng`** — intentional typo from the CollectorX backend. Never rename this field.
- **Loan tagging 25m rule** — "Set Location" button only activates when officer is within 25 metres of the existing loan marker (Haversine distance). If no prior location exists, the button is always active.
- **Radix UI Select + Server Actions** — Radix `<Select>` has no native `name` attribute. Use a controlled `useState` + `<input type="hidden" name="..." value={...} />` pattern when inside a `<form action={serverAction}>`.
- **`window.location.reload()`** after successful loan tagging re-triggers the server fetch, returning the updated coordinates from CollectorX.
- **`next.config` build flags** — keep `typescript: { ignoreBuildErrors: true }` and `eslint: { ignoreDuringBuilds: true }` to match the v0.app workflow.

## Conventions

- **pnpm only** — do not use npm or yarn
- Server Components by default; add `"use client"` only when hooks or browser APIs are required
- Shadcn/ui components live in `components/ui/` — do not edit them; regenerate with `pnpm dlx shadcn@latest add <component>`
- Tailwind CSS 4 — use utility classes; no CSS modules
- No comments unless the reason is non-obvious (e.g. the `loanAddressLang` typo above)

## Phase 1 Scope

**In:** Login with branch selection, loan search (inline result), loan info display, loan tagging screen (`/loans/[bankCode]-[loanType]-[loanCode]/tag`), GPS loan tagging, PWA install, network status indicator.  
**Out:** Offline functionality, collection entry, loan status updates, reporting views, multi-loan lists.

See `docs/phase1-ssr.md` for full architecture diagram, component table, and data flow.
