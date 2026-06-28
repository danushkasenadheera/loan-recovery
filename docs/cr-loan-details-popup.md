# Change Request — View Loan Details Full-Screen Popup

| Field | Value |
|---|---|
| CR ID | CR-004 |
| Title | View Loan Details — Full-Screen Popup |
| Module | Loan Visit (`/loans/[bankCode]/[loanType]/[loanCode]/visits`) |
| Status | Draft |
| Author | — |
| Date | 2026-06-27 |
| Target App | `loan-recovery` (Next.js PWA) + `CollectorXRestAPI` (.NET 8) |

---

## 1. Background

The loan visit page (`/visits`) currently provides field officers with a proximity-gated visit recorder, a visit history list, and a sidebar accordion showing repayment details, guarantors, loan notes, and loan status. However, officers have no way to view a consolidated, full-detail view of the loan from within the visit workflow without navigating away.

This change request adds a **"View Loan Details"** trigger on the visit page that opens a full-screen popup presenting all relevant loan information in a structured, read-only format.

---

## 2. Scope

This CR covers:
- A new button on the loan visit page
- A full-screen modal/overlay component with complete loan information
- Two new backend stored procedure calls (`usp_GetLoanSummaryReport`, `usp_GetLoanBalanceReport`) served via a new `GET /loan-detail-report` endpoint
- No changes to existing data or write operations

Out of scope:
- Editing loan information
- Printing or exporting the loan details view
- Role-based visibility restrictions (all authenticated users can access)

---

## 3. Affected Files

### Frontend — `loan-recovery`

| File | Change |
|---|---|
| `app/loans/[bankCode]/[loanType]/[loanCode]/visits/page.tsx` | Add `LoanDetailsTrigger` below `LoanOwnerAccountsModal` |
| `components/loan-details-trigger.tsx` | **New** — `"use client"` button with open state |
| `components/loan-details-modal.tsx` | **New** — full-screen modal; fetches on open |
| `app/api/loan-detail-report/route.ts` | **New** — Next.js proxy to `GET /loan-detail-report` |
| `types/loan-visit.ts` | Add `LoanDetailReport`, `LoanSummary`, `LoanPaymentEntry`, `LoanPaymentTotals` |

### Backend — `CollectorXRestAPI`

| File | Change |
|---|---|
| `Services/Loans/LoanDetailReportDto.cs` | **New** — DTOs + internal SP result classes |
| `Services/Loans/LoanService.cs` | Add `GetLoanDetailReport()` method |
| `Handlers/Loans/LoanDetailRouteHandler.cs` | Add `GET /loan-detail-report` endpoint |

---

## 4. Functional Requirements

### FR-1 — Trigger Button
- A **"View Loan Details"** button must be placed on the loan visit page, below the "View Account Details" button in the visit controls panel (right column of the visit action card).
- The button must be visible and enabled at all times (not conditional on GPS or location).
- Icon: `FileSearch` or similar document-inspection icon from `lucide-react`.

### FR-2 — Full-Screen Modal
- Clicking the button opens a **full-screen overlay/modal** covering the entire viewport.
- The modal must have a clearly visible **close button** (top-right corner, `X` icon).
- The modal must be scrollable if content exceeds viewport height.
- Closing can also be triggered by pressing `Escape`.

### FR-3 — Content Sections
The modal displays loan information grouped into the following sections. All data is sourced from the `LoanDetail` object already fetched by the visit page (no additional API call on open).

#### 3.1 Loan Header
- Loan reference number (prominent, top of modal)
- Loan owner name
- NIC number
- Branch code

#### 3.2 Loan Details
| Field | Source |
|---|---|
| Loan Amount | `loanAmount` |
| Date of Issue | `dateOfIssue` |
| Final Payment Date | `finalPaymentDate` |
| Interest Rate | `interestRate` |
| No. of Installments | `numberOfInstallments` |
| Installment Amount | `installmentAmount` |
| Block Account No | `blockAccountNo` |
| Address | `address` |

#### 3.3 Loan Status
| Field | Source |
|---|---|
| Loan Balance | `balanceLoanAmount` |
| Last Paid Date | `dateLastPaid` |

#### 3.4 Arrears (from SP `usp_CalculateLoanBalanceRemain`)
| Field | Source |
|---|---|
| Arrears Installments | `arrearsInstallments` |
| Arrears Loan Amount | `arrearsLoanAmount` |
| Arrears Interest Amount | `arrearsInterestAmount` |
| Penalty Interest | `penaltyInterest` |
| Arrears Total Amount | `arrearsTotalAmount` |

#### 3.5 Guarantors
- List of up to 2 guarantors
- Each entry: Name, Address, Mobile
- Show "No guarantors on record" when empty

#### 3.6 Loan Notes
- Timeline display of up to 5 most recent loan notes (from `U_tblLoanRecord`)
- Each entry: date and remarks text
- Show "No notes on record" when empty

#### 3.7 Loan Summary (from SP `usp_GetLoanSummaryReport`)
| Field | SP Column |
|---|---|
| Opening Principal | `OpeningPrincipal` |
| Installments Paid | `NoOfInstallmentsPaid` |
| Principal Paid | `PrincipalPaid` |
| Interest Paid | `InterestPaid` |
| Penalty Paid | `PenaltyPaid` |
| Remaining Principal Balance | `RemainingPrincipalBalance` |
| Interest to Pay (Today) | `InterestToBePaidUptoToday` |
| Penalty to Pay (Today) | `PenaltyInterestToBePaidUptoToday` |

Displayed as a grid of metric cards. `RemainingPrincipalBalance` is highlighted (amber background) as it is the key actionable figure.

#### 3.8 Payment History (from SP `usp_GetLoanBalanceReport`)
Table of all payment transactions for the loan, ordered by `AccBal_SEQ ASC, AccBal_Date ASC` (SP-side ordering, no re-order in API).

| Column | SP Field | Notes |
|---|---|---|
| Date | `AccBal_Date` | Formatted `DD MMM YYYY` |
| Remarks | `AccBal_Rem` | Truncated at 180px |
| Principal | `AccBal_CAmt` | Shown in black; `—` if zero |
| Interest | `AccBal_DAmt` | Shown in blue; `—` if zero |
| Penalty | `AccBal_Panalty` | Shown in orange; `—` if zero |
| Balance | `Running_Principal_Bal` | Window function — cumulative remaining balance |

No filtering, no pagination, no export. All records returned.

**Totals row** (calculated in backend, returned in `Totals` object):
| Column | Calculation |
|---|---|
| Principal Total | `SUM(AccBal_CAmt)` |
| Interest Total | `SUM(AccBal_DAmt)` |
| Penalty Total | `SUM(AccBal_Panalty)` |
| Loan Balance | `RemainingPrincipalBalance` from summary SP |
| Total Paid | Principal + Interest + Penalty (shown as a sub-row) |

### FR-4 — Data Source
- Sections 3.1–3.6 use data already in `LoanDetail` (fetched at page load — no additional API call).
- Sections 3.7–3.8 are fetched **on modal open** from `GET /api/loan-detail-report` (lazy — not fetched on page load).
- Once fetched, data is cached in component state for the lifetime of the page — re-opening the modal does not re-fetch.

---

## 5. UI / UX Specification

### 5.1 Layout
- **Full-screen overlay**: `position: fixed`, covers entire viewport (`inset-0`), `z-index` above all other content.
- **Header bar** (sticky at top): loan reference number on the left, close (`X`) button on the right. Matches the app's `DashboardHeader` height and style.
- **Scrollable content area**: padded, max-width constrained to `max-w-4xl` centered.
- **Section dividers**: each section separated by a border or whitespace.

### 5.2 Visual Design
- Shadcn/ui + Tailwind CSS 4 design tokens throughout
- Section headings: `text-xs font-semibold text-muted-foreground uppercase tracking-wide`
- Summary cards: `rounded-lg border p-3` grid; `RemainingPrincipalBalance` card uses amber highlight (`bg-amber-50 border-amber-200`)
- Payment history: bordered table with `divide-y` rows; hover highlight on rows
- Table number columns: `font-mono` alignment; Interest in blue, Penalty in orange
- Totals footer: `bg-muted font-semibold border-t-2`; sub-row for Total Paid in `bg-muted/50`
- Currency values: formatted as `x,xxx.xx` (no prefix in table cells; `LKR` prefix in summary cards and Total Paid)
- Dates: formatted as `DD MMM YYYY`

### 5.3 Responsive Behaviour
- On mobile (single-column PWA): all sections stack vertically
- On tablet/desktop: sections may use a 2-column grid where appropriate (e.g. loan details fields)

### 5.4 Accessibility
- Modal traps focus while open
- `aria-modal="true"` on the dialog root
- Close button has `aria-label="Close loan details"`

---

## 6. Technical Specification

### 6.1 Component — `LoanDetailsTrigger`

```
components/loan-details-trigger.tsx   ("use client")
```

**Props:** `loan: { bankCode, loanType, loanCode, referenceNo }`

Holds `open` boolean state. Renders the trigger button and mounts `LoanDetailsModal`. Receives loan identifiers from the server page as props.

### 6.2 Component — `LoanDetailsModal`

```
components/loan-details-modal.tsx   ("use client")
```

**Props:** `open`, `onOpenChange`, `loan`

- Implemented as a `fixed inset-0` overlay div (not Shadcn Dialog — avoids portal z-index conflicts with the existing visit page modals)
- On `open` becoming `true`: fetches `GET /api/loan-detail-report` once; caches result in `useState`
- Escape key closes via `useEffect` keydown listener
- Two sections: Summary cards (Section 3.7) and Payment History table (Section 3.8)

### 6.3 API Proxy

```
app/api/loan-detail-report/route.ts
```

GET handler — reads `BankCode`, `LoanType`, `LoanCode` from query, forwards with `Bearer` token to `GET /loan-detail-report` on CollectorX API.

### 6.4 Visit Page Integration

**File:** `app/loans/[bankCode]/[loanType]/[loanCode]/visits/page.tsx`

`<LoanDetailsTrigger>` placed directly below `<LoanOwnerAccountsModal>` in the controls column. Server component passes `{ bankCode, loanType, loanCode, referenceNo: detail.referenceNo }` as props.

---

## 7. Data Contract

### 7.1 Existing — `LoanDetail` (from `GET /loan-details`)
Sections 3.1–3.6 of the modal render from the `LoanDetail` object already fetched at page load. No additional API call.

### 7.2 New — `LoanDetailReport` (from `GET /loan-detail-report`)

```ts
interface LoanDetailReport {
  summary: LoanSummary | null
  paymentHistory: LoanPaymentEntry[]
  totals: LoanPaymentTotals | null
}

interface LoanSummary {
  loanNo: string | null
  openingPrincipal: number
  noOfInstallmentsPaid: number
  principalPaid: number
  interestPaid: number
  penaltyPaid: number
  remainingPrincipalBalance: number
  interestToBePaidUptoToday: number
  penaltyInterestToBePaidUptoToday: number
}

interface LoanPaymentEntry {
  accountNo: string | null
  date: string | null
  remarks: string | null
  openingBalance: number         // AccBal_OPBAL — overall opening balance (same on all rows)
  principal: number              // AccBal_CAmt
  interest: number               // AccBal_DAmt
  sequence: number               // AccBal_SEQ
  penalty: number                // AccBal_Panalty
  branchCode: string | null      // AccBal_Loc
  runningPrincipalBalance: number // Running_Principal_Bal (window function from SP)
}

interface LoanPaymentTotals {
  totalPrincipal: number         // SUM(AccBal_CAmt)
  totalInterest: number          // SUM(AccBal_DAmt)
  totalPenalty: number           // SUM(AccBal_Panalty)
  totalPaidAmount: number        // Principal + Interest + Penalty
  loanBalance: number            // = RemainingPrincipalBalance from summary SP
}
```

### 7.3 Backend Stored Procedures

| SP | Inputs | Returns |
|---|---|---|
| `usp_GetLoanSummaryReport` | `LocationCode`, `LoanCode`, `LoanType` | Single-row summary |
| `usp_GetLoanBalanceReport` | `LocationCode`, `LoanCode`, `LoanType` | All payment rows with `Running_Principal_Bal` window column |

---

## 8. Acceptance Criteria

| # | Criteria |
|---|---|
| AC-1 | "View Loan Details" button appears on the visit page below "View Account Details" |
| AC-2 | Clicking the button opens a full-screen overlay without navigating away |
| AC-3 | Summary section displays all 8 fields from `usp_GetLoanSummaryReport` |
| AC-4 | `RemainingPrincipalBalance` card is highlighted in amber |
| AC-5 | Payment history table shows all rows returned by `usp_GetLoanBalanceReport` |
| AC-6 | Running balance column shows the `Running_Principal_Bal` window function value |
| AC-7 | Totals row shows: Principal Total, Interest Total, Penalty Total, Loan Balance |
| AC-8 | Total Paid sub-row shows sum of Principal + Interest + Penalty |
| AC-9 | Currency values are formatted as `x,xxx.xx`; summary cards prefix `LKR` |
| AC-10 | Dates are formatted as `DD MMM YYYY` |
| AC-11 | Modal shows a spinner while fetching; error state if fetch fails |
| AC-12 | Re-opening the modal does not re-fetch (data cached in state) |
| AC-13 | Modal closes on `X` button click and `Escape` key |
| AC-14 | Payment history table is horizontally scrollable on narrow viewports |
| AC-15 | Other page functionality (RECORD VISIT, View Account Details) unaffected |

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| OQ-1 | What additional data sections should appear in the popup? | Product | **Resolved** — Loan Summary (usp_GetLoanSummaryReport) + Payment History (usp_GetLoanBalanceReport) |
| OQ-2 | Exact visual design from `Loan Inquiry.dc.html` | Design | **Resolved** — Design applied based on existing app design system |
| OQ-3 | Should arrears highlighting use a specific threshold? | Product | **Closed** — Not applicable; only `RemainingPrincipalBalance` card is highlighted |

---

## 10. Dependencies

| Dependency | Status |
|---|---|
| `LoanDetail` type with all current fields | Done |
| `/loan-details` API returns arrears + NIC + loan notes | Done |
| `usp_GetLoanSummaryReport` SP exists in SQL Server | Confirmed |
| `usp_GetLoanBalanceReport` SP exists in SQL Server | Confirmed |
| `GET /loan-detail-report` endpoint | Done |
| `LoanDetailReport` TypeScript types | Done |
| `components/loan-details-modal.tsx` | Done |
| `components/loan-details-trigger.tsx` | Done |
| `app/api/loan-detail-report/route.ts` | Done |
| Visit page wired up | Done |

## 11. Status

**Implementation complete.** All backend and frontend changes delivered. SRS reflects final implementation.
