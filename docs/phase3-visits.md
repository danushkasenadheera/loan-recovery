# Phase 3 — Loan Visits Spec
## HDC Coop Bank · Loan Recovery System

---

## Overview

Field officers record visits to loan holders at their tagged GPS location. The loan visits page shows full loan details, a read-only map, guarantor information, and the visit history. Officers can record a new visit when physically within 25 metres of the tagged location.

Each visit captures a statement and signature from the loan obtainer, part payment details, the officer's instructions and signature. Guarantor signatures can be added to a visit record at any time from anywhere. A manager can add an instruction note and signature from a separate backoffice application.

**New in Phase 3:** one database table, five CollectorX API endpoints, one Next.js page, and supporting components.

---

## Features

| # | Feature | Description |
|---|---|---|
| 1 | Loan visits page | New page at `/loans/[bankCode]/[loanType]/[loanCode]/visits` |
| 2 | Loan detail card | Full loan details including calculated final payment date and guarantors |
| 3 | Read-only map | Shows tagged loan location pin; "Open in Google Maps" button |
| 4 | Visit list | Latest 50 visits, newest first; each row has G1, G2, and View buttons |
| 5 | Record Visit | Multi-step form; activates only within 25m of tagged location |
| 6 | Guarantor signatures | G1/G2 buttons on each visit row; canvas pad; recorded at any time |
| 7 | Visit detail popup | View button opens full visit details including all signatures |
| 8 | Manager note/sign | Stored in DB; displayed in View popup if added by backoffice |
| 9 | Visits button | New button on dashboard loan card navigates to visits page |

---

## Navigation

**Entry point:** Dashboard loan card — new "Visits" button alongside existing buttons.

```
[ Tag Location ]  [ Reminders ]  [ Visits ]
```

Navigates to:
```
/loans/{bankCode}/{loanType}/{loanCode}/visits
```

---

## Visits Page Layout

```
┌─────────────────────────────────────────────┐
│ DashboardHeader (sticky)                    │
├─────────────────────────────────────────────┤
│ ← Back to Dashboard                         │
├─────────────────────────────────────────────┤
│ LOAN DETAIL CARD                            │
│  Reference No · Address · Account No        │
│  Loan Amount · Issue Date · Installment     │
│  Final Payment Date · Interest · Period     │
├─────────────────────────────────────────────┤
│ GUARANTORS                                  │
│  Name · Address · Mobile  (per guarantor)   │
├─────────────────────────────────────────────┤
│ MAP (read-only, h-48)                       │
│  [ Open in Google Maps ↗ ]                  │
├─────────────────────────────────────────────┤
│ VISIT HISTORY                               │
│  [ Record Visit ]  (activates within 25m)  │
│  ─────────────────────────────────────────  │
│  Visit row · Visit row · Visit row …        │
└─────────────────────────────────────────────┘
```

---

## Loan Detail Card Fields

| Display Label | Source Column | Notes |
|---|---|---|
| Reference No | `Loan_Loc / Loan_Code / Loan_Type` | Concatenated string |
| Address | `Loan_Address1` | |
| Bank Account | `Loan_BlockAccNo` | |
| Loan Amount | `Loan_LoanAmt` | Formatted as currency |
| Date of Issue | `Loan_date` | |
| Loan Installment | `Loan_InsAmt` | |
| Final Payment Date | Calculated: `Loan_date + Loan_Period months` | Server-side |
| Interest Rate | `Loan_InterPer` | Displayed as percentage |
| No of Installments | `Loan_Period` | |

### Guarantors

Sourced from `M_tblMember` via `Loan_GuaranteeMem1` and `Loan_GuaranteeMem2`.

| Display Label | Source Column |
|---|---|
| Name | `Member_MemberName` |
| Address | `Member_Addres` |
| Mobile | `Member_TelMobile` |

- A loan may have 0, 1, or 2 guarantors (either field can be null/empty)
- `Loan_GuaranteeMem1` / `Loan_GuaranteeMem2` → `Member_MemberNo`
- `BankCode` → `Member_StoresNO` (tenant isolation)
- Guarantors are included in the `/loan-details` response — no separate endpoint

---

## Map (Read-Only)

- Shows a single red pin at the loan's tagged coordinates (`LoanAddressLat`, `LoanAddressLang`)
- If no location is tagged: shows "Location not tagged yet" — no map rendered
- **Open in Google Maps button**: opens `https://www.google.com/maps?q={lat},{lng}` in a new tab (launches Maps app on mobile)

---

## Visit List Row

Each row shows:

```
21 Jun 2026 10:30  —  Kamal Perera  —  Part Pmt: LKR 5,000
[ G1 ]  [ G2 ]  [ View ]
```

- **G1 / G2 buttons**: if signature not yet recorded → active, opens signature canvas; if recorded → shows "Signed ✓", disabled
- **View button**: opens Visit Detail popup with all fields and signatures

---

## Record Visit Flow

Activated only when the officer is within 25m of the tagged loan location (same Haversine check as Tag Location). Disabled with tooltip "Loan location not tagged yet" if no location is set.

### Form fields

| Field | Type | Required |
|---|---|---|
| Loan obtainer statement | Textarea | Yes |
| Loan obtainer signature | Canvas signature pad | Yes |
| Part payment made | Checkbox | No |
| → Part payment date | Date picker (default: visit date, can be historical) | If part payment checked |
| → Part payment amount | Number input | If part payment checked |
| Officer instructions | Textarea | Yes |
| Officer signature | Canvas signature pad | Yes |

- `VisitedAt` is always the server datetime at submission — not user-entered
- Officer's GPS coordinates at submission time are recorded as `VisitLat` / `VisitLang`

---

## Guarantor Signature Flow

- Accessible from any visit row at any time (no proximity requirement)
- Clicking G1 or G2 opens a modal with a canvas signature pad
- On submit: signature stored with `SignedAt` timestamp
- **Once recorded, cannot be changed** — G1/G2 buttons become permanently disabled

---

## Signature Canvas Pad

Reusable `SignaturePad` client component used in three places: obtainer signature, officer signature, and guarantor signature modal.

- Full touch support (touchstart / touchmove / touchend) for mobile
- Mouse support for desktop
- "Clear" button to reset the canvas
- On submit: `canvas.toDataURL('image/png')` → base64 string sent to API
- API converts base64 → `byte[]` → stored as `VARBINARY(MAX)`
- On display: API returns base64 string → frontend renders as `<img src="data:image/png;base64,..." />`

---

## Visit Detail Popup (View)

Opens as a Dialog on "View" button click. Calls `GET /loan-visits/{id}` for full data.

Sections:

```
─── Visit Info ────────────────────────────────
Date / Time: 21 Jun 2026 10:30
Officer: Kamal Perera
GPS: 6.9275, 79.8615

─── Loan Obtainer ─────────────────────────────
Statement: [text]
Signature: [image]

─── Part Payment ──────────────────────────────
Amount: LKR 5,000   Date: 15 Jun 2026
(hidden if PartPaymentMade = false)

─── Officer Instructions ───────────────────────
Instructions: [text]
Signature: [image]

─── Guarantor 1 Signature ─────────────────────
[image]  Signed: 22 Jun 2026 09:15
(or "Not yet recorded")

─── Guarantor 2 Signature ─────────────────────
[image]  Signed: 22 Jun 2026 11:00
(or "Not yet recorded")

─── Manager Note ──────────────────────────────
Note: [text]
Signature: [image]  Added: 23 Jun 2026 14:30
(entire section hidden if no manager note)
```

---

## Manager Note and Signature

- Added via a **separate backoffice application** — no UI built in this project
- CollectorX API provides `PUT /loan-visits/{id}/manager` endpoint for the backoffice to call
- Stored in DB with `ManagerNoteAt` timestamp
- Displayed in the View popup if present; entire section hidden if not yet added

---

## Database

### New table: `T_tblLoanVisit`

```sql
CREATE TABLE [dbo].[T_tblLoanVisit] (
    -- Identity
    [Id]                    INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    [BankCode]              NVARCHAR(10)    NOT NULL,
    [LoanType]              NVARCHAR(20)    NOT NULL,
    [LoanCode]              NVARCHAR(20)    NOT NULL,
    [UserId]                NVARCHAR(50)    NOT NULL,
    [UserName]              NVARCHAR(100)   NOT NULL,
    [VisitedAt]             DATETIME        NOT NULL DEFAULT GETDATE(),
    [VisitLat]              DECIMAL(9,6)    NOT NULL,
    [VisitLang]             DECIMAL(9,6)    NOT NULL,

    -- Loan obtainer (required at visit time)
    [ObtainerStatement]     NVARCHAR(MAX)   NOT NULL,
    [ObtainerSignature]     VARBINARY(MAX)  NOT NULL,

    -- Part payment (optional)
    [PartPaymentMade]       BIT             NOT NULL DEFAULT 0,
    [PartPaymentDate]       DATE            NULL,
    [PartPaymentAmount]     DECIMAL(18,2)   NULL,

    -- Visiting officer (required at visit time)
    [OfficerInstructions]   NVARCHAR(MAX)   NOT NULL,
    [OfficerSignature]      VARBINARY(MAX)  NOT NULL,

    -- Guarantor signatures (optional, any time after visit)
    [Guarantor1Signature]   VARBINARY(MAX)  NULL,
    [Guarantor1SignedAt]    DATETIME        NULL,
    [Guarantor2Signature]   VARBINARY(MAX)  NULL,
    [Guarantor2SignedAt]    DATETIME        NULL,

    -- Manager (added from backoffice)
    [ManagerNote]           NVARCHAR(MAX)   NULL,
    [ManagerSignature]      VARBINARY(MAX)  NULL,
    [ManagerNoteAt]         DATETIME        NULL
);

CREATE NONCLUSTERED INDEX [IX_LoanVisit_Loan]
    ON [dbo].[T_tblLoanVisit]
    ([BankCode] ASC, [LoanType] ASC, [LoanCode] ASC, [VisitedAt] DESC);

GRANT SELECT  ON [dbo].[T_tblLoanVisit] TO [codexpublec];
GRANT INSERT  ON [dbo].[T_tblLoanVisit] TO [codexpublec];
GRANT UPDATE  ON [dbo].[T_tblLoanVisit] TO [codexpublec];
```

**Notes:**
- `UserName` denormalized from JWT at visit time — no join needed on read
- `VisitLat` / `VisitLang` = officer's GPS at submission, not the loan's tagged location
- `ObtainerSignedAt` and `OfficerSignedAt` are not stored separately — `VisitedAt` covers them
- Guarantor and manager columns are NULL until recorded
- No soft delete — visit log is permanent; UPDATE permission is for guarantor/manager additions only

---

## CollectorX API Endpoints

### GET `/loan-details`

Returns full loan details + guarantors. Unchanged from initial spec.

**Query params:** `BankCode`, `LoanType`, `LoanCode` · **Auth:** Bearer required

---

### GET `/loan-visits`

Returns latest 50 visits for a loan, **without blob data** (list view only).

**Query params:** `BankCode`, `LoanType`, `LoanCode` · **Auth:** Bearer required

**Response:**

```json
[
  {
    "id": 42,
    "userName": "Kamal Perera",
    "visitedAt": "2026-06-21T10:30:00",
    "visitLat": 6.9275,
    "visitLang": 79.8615,
    "partPaymentMade": true,
    "partPaymentAmount": 5000.00,
    "hasGuarantor1Signature": false,
    "guarantor1SignedAt": null,
    "hasGuarantor2Signature": true,
    "guarantor2SignedAt": "2026-06-22T09:15:00",
    "hasManagerNote": false
  }
]
```

---

### GET `/loan-visits/{id}`

Returns full visit detail **including all blobs as base64 strings**.

**Auth:** Bearer required

**Response:**

```json
{
  "id": 42,
  "userName": "Kamal Perera",
  "visitedAt": "2026-06-21T10:30:00",
  "visitLat": 6.9275,
  "visitLang": 79.8615,

  "obtainerStatement": "Loan holder was present and cooperative.",
  "obtainerSignature": "data:image/png;base64,iVBOR...",

  "partPaymentMade": true,
  "partPaymentDate": "2026-06-15",
  "partPaymentAmount": 5000.00,

  "officerInstructions": "Follow up in 2 weeks.",
  "officerSignature": "data:image/png;base64,iVBOR...",

  "guarantor1Signature": null,
  "guarantor1SignedAt": null,
  "guarantor2Signature": "data:image/png;base64,iVBOR...",
  "guarantor2SignedAt": "2026-06-22T09:15:00",

  "managerNote": null,
  "managerSignature": null,
  "managerNoteAt": null
}
```

---

### POST `/loan-visits`

Records a new visit. `UserId` and `UserName` extracted from JWT.

**Auth:** Bearer required

**Request body:**

```json
{
  "bankCode": "012",
  "loanType": "PL",
  "loanCode": "00000028",
  "visitLat": 6.9275,
  "visitLang": 79.8615,
  "obtainerStatement": "Loan holder was present.",
  "obtainerSignature": "data:image/png;base64,iVBOR...",
  "partPaymentMade": true,
  "partPaymentDate": "2026-06-15",
  "partPaymentAmount": 5000.00,
  "officerInstructions": "Follow up in 2 weeks.",
  "officerSignature": "data:image/png;base64,iVBOR..."
}
```

**Response:** Created visit as list DTO (no blobs)

---

### PUT `/loan-visits/{id}/guarantor1`

Records guarantor 1 signature. Fails with 409 if already recorded.

**Auth:** Bearer required

**Request body:**

```json
{ "signature": "data:image/png;base64,iVBOR..." }
```

---

### PUT `/loan-visits/{id}/guarantor2`

Records guarantor 2 signature. Fails with 409 if already recorded.

Same shape as guarantor1.

---

### PUT `/loan-visits/{id}/manager`

Adds manager note and/or signature. Called from the separate backoffice application.

**Auth:** Bearer required

**Request body:**

```json
{
  "managerNote": "Escalate to legal team if no payment by end of month.",
  "managerSignature": "data:image/png;base64,iVBOR..."
}
```

---

## Next.js Proxy Routes

| Method | Next.js Route | Proxies to |
|---|---|---|
| GET | `/api/loan-details` | `GET /loan-details` |
| GET | `/api/loan-visits` | `GET /loan-visits` |
| POST | `/api/loan-visits` | `POST /loan-visits` |
| GET | `/api/loan-visits/[id]` | `GET /loan-visits/{id}` |
| PUT | `/api/loan-visits/[id]/guarantor1` | `PUT /loan-visits/{id}/guarantor1` |
| PUT | `/api/loan-visits/[id]/guarantor2` | `PUT /loan-visits/{id}/guarantor2` |

*(Manager endpoint is called directly by the backoffice app — no Next.js proxy needed)*

---

## Component Architecture

```
visits/page.tsx  (Server Component — SSR)
  ├── fetchLoanDetails()  →  GET /api/loan-details  (cache: no-store)
  ├── fetchVisits()       →  GET /api/loan-visits   (cache: no-store)
  ├── DashboardHeader
  ├── Back button         →  /dashboard?BankCode=&LoanType=&LoanCode=
  ├── LoanDetailCard      (Server — pure display, includes guarantors)
  ├── LoanVisitMap        (Client — Google Maps read-only + Open in Maps)
  └── LoanVisitRecorder   (Client — GPS, 25m check, record visit form)
        ├── SignaturePad  (Client — reusable canvas component)
        └── LoanVisitList (receives initialVisits prop from SSR)
              ├── GuarantorSignatureModal  (Client — canvas pad for G1/G2)
              └── LoanVisitDetailModal     (Client — fetches /api/loan-visits/[id])
```

---

## New Files

### Backend (CollectorX API)

| File | Purpose |
|---|---|
| `Services/Visits/LoanVisit.cs` | EF Core entity for `T_tblLoanVisit` |
| `Services/Visits/LoanVisitDto.cs` | `LoanVisitListDto`, `LoanVisitDetailDto`, `CreateVisitRequest`, `RecordGuarantorSignatureRequest`, `AddManagerNoteRequest` |
| `Database/Configurations/LoanVisitEntityTypeConfiguration.cs` | Table + column mappings |
| `Services/Visits/LoanVisitService.cs` | All visit business logic |
| `Handlers/Visits/LoanVisitRouteHandler.cs` | All `/loan-visits` routes |
| `Services/Loans/LoanDetailDto.cs` | `LoanDetailDto`, `GuarantorDto` |
| `Handlers/Loans/LoanDetailRouteHandler.cs` | `/loan-details` GET |
| SQL: `visit-table-create.sql` | `T_tblLoanVisit` DDL + index + permissions |

### Frontend (loan-recovery)

| File | Purpose |
|---|---|
| `app/loans/[bankCode]/[loanType]/[loanCode]/visits/page.tsx` | SSR page — fetches details + visits |
| `components/loan-detail-card.tsx` | Server Component — loan fields + guarantors |
| `components/loan-visit-map.tsx` | Client — read-only map + Open in Maps |
| `components/loan-visit-recorder.tsx` | Client — GPS check, record visit form |
| `components/signature-pad.tsx` | Client — reusable canvas signature component |
| `components/loan-visit-list.tsx` | Client — visit rows with G1/G2/View buttons |
| `components/guarantor-signature-modal.tsx` | Client — canvas modal for G1/G2 |
| `components/loan-visit-detail-modal.tsx` | Client — full visit detail popup |
| `app/api/loan-details/route.ts` | GET proxy |
| `app/api/loan-visits/route.ts` | GET list + POST |
| `app/api/loan-visits/[id]/route.ts` | GET detail |
| `app/api/loan-visits/[id]/guarantor1/route.ts` | PUT G1 signature |
| `app/api/loan-visits/[id]/guarantor2/route.ts` | PUT G2 signature |
| `types/loan-visit.ts` | `LoanVisitListItem`, `LoanVisitDetail`, `LoanDetail`, `Guarantor` |

### Modified Files

| File | Change |
|---|---|
| `components/loan-info-card.tsx` | Add "Visits" button linking to visits page |

---

## SSR Strategy

- `loan-details` and initial `loan-visits` list fetched **server-side** on page load (no blobs)
- `LoanVisitList` receives initial visits as a prop from the server component
- After recording a new visit: `window.location.reload()` re-triggers SSR fetch
- After recording a guarantor signature: list item updates optimistically (G1/G2 button → "Signed ✓")
- Visit Detail popup fetches `/api/loan-visits/[id]` client-side on open (blobs only loaded on demand)

---

## What is NOT in Phase 3

- Editing or deleting visit records
- Visit filtering by date range or user
- Backoffice UI for manager note/sign (separate application)
- Push notifications
- Visit analytics or reporting
- Changes to the Android mobile app
