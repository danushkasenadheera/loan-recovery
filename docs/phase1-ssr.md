# Phase 1 — SSR Implementation Spec
## HDC Coop Bank · Loan Recovery System

---

## Overview

Field officers log in, search for a loan, view the result inline, and tag the loan's GPS location. All data fetching happens on the server — no client-side API calls except for the Google Maps component (browser GPS API).

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Shadcn/ui · pnpm  
**Backend:** CollectorX REST API (`API_BASE_URL`) · JWT auth (HttpOnly cookie, 24h)  
**Delivery:** Progressive Web App — installable on Android/iOS, offline fallback page, service worker app-shell cache

---

## Phase 1 Features

| # | Feature | Description |
|---|---|---|
| 1 | Branch-aware login | Officer selects branch from dropdown, enters username + password |
| 2 | Protected dashboard | Middleware redirects unauthenticated requests to `/login` |
| 3 | Loan search | Search by Loan Type + Loan Code (bank code auto-filled for branch users) |
| 4 | Inline loan result | Loan info card rendered server-side below the search form — no page navigation |
| 5 | Loan tagging | Google Maps component lets officer mark GPS coordinates when physically at the location |
| 6 | PWA — installable | Web App Manifest + service worker; officers can add to Android/iOS home screen |
| 7 | Network status indicator | Badge in header shows online/offline state in real time — app does not function offline |

---

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Middleware redirect | → `/dashboard` if authenticated, → `/login` if not |
| `/login` | Server Component | Fetch branches SSR → render `<LoginForm>` |
| `/dashboard` | Server Component | Fetch loan types + loan data (if URL params present) → render inline |
| `/loans/[bankCode]-[loanType]-[loanCode]/tag` | Server Component | Loan tagging screen |

### URL-Driven Search

The dashboard uses URL query params as the source of truth for search state:

```
/dashboard?BankCode=001&LoanType=PL&LoanCode=00000028
```

The server reads these params, fetches the loan from CollectorX, and renders the result. A page reload always returns consistent data.

### Loan Tagging Route

```
/loans/001-PL-00000028/tag
        │    │   └── loanCode   → params.loanCode
        │    └────── loanType   → params.loanType
        └─────────── bankCode   → params.bankCode
```

Next.js folder: `app/loans/[bankCode]-[loanType]-[loanCode]/tag/page.tsx`  
Each segment is a separate route param — no manual string splitting needed.

The tagging page uses the three params directly, fetches the loan and the branch name independently, then renders the tagging screen. The "Back to Dashboard" button reconstructs the dashboard URL from the params:

```
/dashboard?BankCode=001&LoanType=PL&LoanCode=00000028
```

This preserves the search state without needing to pass it through the URL.

---

## Architecture

```
Browser                          Next.js Server                    CollectorX API
  │                                    │                                  │
  │── GET /login ──────────────────────►│── GET /branches ────────────────►│
  │◄── HTML (branch list baked in) ────│◄── [...] ───────────────────────│
  │                                    │                                  │
  │── POST /login (Server Action) ─────►│── POST /login ──────────────────►│
  │                                    │◄── { token, bankCode, role } ───│
  │◄── Set-Cookie: auth-token ─────────│ sign JWT, set HttpOnly cookie    │
  │── redirect /dashboard              │                                  │
  │                                    │                                  │
  │── GET /dashboard?BankCode=...──────►│── GET /loan-type ───────────────►│
  │                                    │── GET /loan?BankCode=... ────────►│
  │◄── HTML (loan types + loan data) ──│◄── loan data ───────────────────│
  │                                    │                                  │
  │── PUT /api/loan-location ──────────►│── PUT /loan-location ───────────►│
  │   (from GoogleMapComponent)        │◄── updated ─────────────────────│
  │◄── { success: true } ──────────────│                                  │
  │── window.location.reload()         │                                  │
```

---

## File Structure

```
loan-recovery/
├── app/
│   ├── layout.tsx                  # Root layout — PWA metadata, manifest link, viewport, fonts
│   ├── page.tsx                    # Redirect root → /login
│   ├── login/
│   │   └── page.tsx                # Server Component — fetch branches, render LoginForm
│   ├── dashboard/
│   │   └── page.tsx                # Server Component — fetch loan types + loan, inline result
│   ├── loans/
│   │   └── [bankCode]-[loanType]-[loanCode]/
│   │       └── tag/
│   │           └── page.tsx        # Server Component — loan tagging screen
│   ├── actions/
│   │   └── auth-actions.ts         # loginAction, logoutAction (Server Actions)
│   └── api/
│       ├── auth/
│       │   └── logout/route.ts     # POST — clear cookie
│       └── loan-location/
│           └── route.ts            # PUT — proxy GPS update to CollectorX
├── components/
│   ├── login-form.tsx              # "use client" — branch select + credentials form
│   ├── loan-search-form.tsx        # "use client" — 3 inputs, navigates via URL params
│   ├── loan-info-card.tsx          # Server Component — read-only loan details display
│   ├── dashboard-header.tsx        # "use client" — user info + logout button
│   ├── google-map.tsx              # "use client" — Google Maps + geolocation + tag button
│   ├── network-status-indicator.tsx # "use client" — online/offline badge
│   ├── pwa-install-prompt.tsx      # "use client" — captures beforeinstallprompt, shows banner
│   ├── pwa-initializer.tsx         # "use client" — registers /sw.js on mount
│   └── ui/                         # Shadcn/ui components (do not edit)
├── lib/
│   ├── jwt.ts                      # createJWT, verifyJWT, setAuthCookie, getSession, clearAuthCookie
│   └── utils.ts                    # cn() helper
├── types/
│   └── auth.ts                     # LoginCredentials, LoginResponse, User
├── middleware.ts                   # JWT validation + route protection; matcher excludes PWA statics
├── public/
│   ├── sw.js                       # Service Worker — app-shell cache + offline fallback
│   ├── manifest.json               # Web App Manifest
│   ├── icon-192x192.png            # PWA icon — home screen / splash
│   └── icon-512x512.png            # PWA icon — large / maskable
├── CLAUDE.md
└── docs/
    └── phase1-ssr.md               # This document
```

---

## Components — Server vs Client

| Component | Directive | Reason |
|---|---|---|
| `app/login/page.tsx` | Server | Fetches branches at request time |
| `app/dashboard/page.tsx` | Server | Fetches loan types + loan data at request time |
| `app/loans/[bankCode]-[loanType]-[loanCode]/tag/page.tsx` | Server | Fetches loan + branch name, renders tagging screen |
| `components/loan-info-card.tsx` | Server | Pure display + "Tag Location" link to `/loans/[bankCode]-[loanType]-[loanCode]/tag` |
| `components/login-form.tsx` | `"use client"` | Controlled inputs, `useActionState` |
| `components/loan-search-form.tsx` | `"use client"` | Controlled inputs, `useRouter` for URL navigation |
| `components/dashboard-header.tsx` | `"use client"` | Logout button, wraps client-only indicators |
| `components/google-map.tsx` | `"use client"` | `navigator.geolocation`, Google Maps JS SDK |
| `components/network-status-indicator.tsx` | `"use client"` | `window.addEventListener('online'/'offline')` |
| `components/pwa-install-prompt.tsx` | `"use client"` | `beforeinstallprompt` event |
| `components/pwa-initializer.tsx` | `"use client"` | `navigator.serviceWorker.register()` |

---

## Server Actions (`app/actions/auth-actions.ts`)

### `loginAction(prevState, formData)`
1. Extract `bankCode`, `userName`, `password` from `FormData`
2. `POST ${API_BASE_URL}/login` with credentials
3. On failure → return `{ error: 'Invalid credentials' }` (shown in `LoginForm`)
4. On success → `setAuthCookie(user)` → `redirect('/dashboard')`

### `logoutAction()`
1. `clearAuthCookie()`
2. `redirect('/login')`

---

## API Routes (kept)

| Route | Method | Purpose |
|---|---|---|
| `app/api/auth/logout/route.ts` | POST | Alternative logout path (PWA/fallback) |
| `app/api/loan-location/route.ts` | PUT | Proxy GPS update — called by `GoogleMapComponent` after tagging |

The login flow no longer uses an API route — it goes through the `loginAction` Server Action directly.

---

## Auth Flow Detail

```
LoginForm (client) ──formAction──► loginAction (server)
                                        │
                                   POST /login → CollectorX
                                        │
                                   Response: { id, userName, bankCode, role, token }
                                        │
                                   setAuthCookie({
                                     id, userName, bankCode,
                                     userType: role === 1 ? 'Admin' : 'General User',
                                     authToken: token      ← forwarded as Bearer on all CollectorX calls
                                   })
                                        │
                                   redirect('/dashboard')
```

**JWT payload** (signed with `NEXTAUTH_SECRET`, HS256, 24h):
```json
{ "userId", "userName", "bankCode", "userType", "authToken" }
```

---

## Role-Based Behaviour

| Role | `userType` | `bankCode` | Search behaviour |
|---|---|---|---|
| Head Office | `"Admin"` | `"000"` | Bank code input is **editable** — can search any branch |
| Branch Officer | `"General User"` | e.g. `"012"` | Bank code input is **locked** to their own branch |

---

## Loan Tagging Flow

1. Dashboard server-renders `<GoogleMapComponent>` with `loanLocation` prop (from DB) and `loanData`
2. Component auto-calls `navigator.geolocation.getCurrentPosition()` on mount
3. Red marker = stored loan location · Yellow marker = officer's live GPS
4. "Set Location" button activates only when officer is within **25 metres** (Haversine distance)
5. On confirm → `PUT /api/loan-location` (Next.js route → CollectorX `/loan-location`)
6. On success → `window.location.reload()` → server re-fetches, updated coordinates shown

**Field name note:** CollectorX returns `loanAddressLang` (not `Lng`) — intentional typo from the backend. Do not rename.

---

## Environment Variables

```env
NEXTAUTH_SECRET=          # JWT signing secret — openssl rand -base64 32
API_BASE_URL=             # CollectorX backend — e.g. http://localhost:5106
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # Google Maps JS API key
```

---

## PWA Details

### Web App Manifest (`public/manifest.json`)

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

### Service Worker (`public/sw.js`)

Minimal SW — required by browsers for the PWA install prompt. No caching strategy, no offline handling. The app requires a network connection to function.

```js
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
// No fetch handler — all requests go to the network as normal
```

### Middleware Matcher

Must exclude PWA static assets from JWT validation:

```ts
matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)']
```

### Install Prompt Flow

1. Browser fires `beforeinstallprompt` → `PwaInstallPrompt` captures and defers it
2. Component shows a dismissible banner: "Install HDC Loan Recovery on your device"
3. User taps Install → `deferredPrompt.prompt()` called → OS shows native install dialog
4. Banner hidden after install or dismiss

---

## Loan Tagging Page (`/loans/[bankCode]-[loanType]-[loanCode]/tag`)

### Server-side data fetching

Route params `{ bankCode, loanType, loanCode }` are available directly — no splitting needed.

Two parallel fetches on the server:
1. `GET /loan?BankCode=&LoanType=&LoanCode=` — loan data (requires Bearer token)
2. `GET /branches` — branches list (no auth) → find branch where `bankCode` matches → extract `bankName`

If loan not found → `notFound()`. If branches fetch fails → fall back to showing bank code only.

### Page Layout

```
┌─────────────────────────────────────────┐
│  DashboardHeader (HDC logo, user, logout)│
├─────────────────────────────────────────┤
│  ← Back to Dashboard                    │  ← Link → /dashboard?BankCode=&LoanType=&LoanCode=
├─────────────────────────────────────────┤
│  Branch Name  │  Loan Type  │  Loan Code │  ← Info bar (server-rendered, 3 columns)
├─────────────────────────────────────────┤
│                                         │
│          Google Map (tall)              │  ← GoogleMapComponent (client)
│     Red pin = stored location           │    Auto-fetches officer GPS on mount
│     Yellow pin = officer GPS            │
│                                         │
├─────────────────────────────────────────┤
│  [ Get My Location ]                    │  ← Button inside GoogleMapComponent
│  [ Set Loan Location ] (25m rule)       │
│  ── success / error messages ──         │
└─────────────────────────────────────────┘
```

### Navigation

| From | Action | To |
|---|---|---|
| `LoanInfoCard` on dashboard | "Tag Location" `<Link>` | `/loans/001-PL-00000028/tag` |
| Tagging page | "Back to Dashboard" `<Link>` | `/dashboard?BankCode=001&LoanType=PL&LoanCode=00000028` |

### Post-tag behaviour

After a successful GPS tag:
- `GoogleMapComponent` calls `PUT /api/loan-location`
- On success → `window.location.reload()` — server re-fetches the loan, map re-renders with the updated red pin
- Success message shown at the bottom of the map section
- Officer uses the "Back to Dashboard" link when done — dashboard re-renders with the search results still visible

### `GoogleMapComponent` on the tagging page

Same component as used on the dashboard. On this page:
- Map height is taller (dedicated screen, not a sidebar card)
- Info bar above the map is server-rendered (branch name, loan type, loan code) — not inside the component
- Component only handles map, geolocation, proximity check, tag button, and messages

---

## What Is NOT in Phase 1

- Offline functionality (app requires network to operate)
- Collection entry (recording payments)
- Loan status updates
- Admin / management reporting views
- Multi-loan list views
- Push notifications
