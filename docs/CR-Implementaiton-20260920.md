# Implementation Plan & Estimate — CR-20260920

| Field | Value |
|---|---|
| CR | `CR-20260920.md` |
| Date | 2026-09-20 (updated) |
| Status | **Planned — no application code written yet** (F3 stored procedure already deployed) |
| Projects | `CollectorXRestAPI` (.NET 8) · `loan-recovery` (Next.js 15) · SQL Server |

| Feature | Summary | Estimate |
|---|---|---|
| **F1** Search by obtainer name | New `GET /loan-search`, live name search on the dashboard | ≈ 22 h |
| **F2** Visit outside GPS range | Override button, server-decided `OutOfRange` flag, badge | ≈ 18.5 h |
| **F3** Interest Installments Paid tile | API reads SP column `NoOfInterestPaid`, new tile, tile rename, 7-column layout (SP already done) | ≈ 5.25 h (remaining) |
| **F4** Loan note type (mode) | Read `LoanRecord_Mode`, isolated lookup in `M_tblLoanRecTypes`, label on each note, SQL grant | ≈ 7.25 h |
| **F5** Member share in Loan Details section | `MemberShare` lookup for the obtainer, DTO field, one row in the visits sidebar (entity/config already done) — **implemented, not deployed** | ≈ 4.5 h |
| | Sum of all five | 57.5 h |
| | Saving if released together (one deploy + one regression pass instead of five) | −3 h |
| | **Total if built together** | **≈ 54.5 h (about 6.8 working days)** |

The features are independent; any can ship alone. Estimates are planning figures, not measurements, for one developer familiar with the codebases.

---

# Feature F1 — Search by Obtainer Name

## F1.1 Approach

Add one read-only endpoint, `GET /loan-search`, returning up to 50 active loans in a bank whose obtainer name contains the typed text. Add a Next.js proxy, then extend `LoanSearchForm` with a "Name" mode that searches as the officer types (debounced, cancellable) and lists matches inline. Tapping a row goes to the existing `/dashboard?BankCode=&LoanType=&LoanCode=` URL, so nothing after selection changes.

## F1.2 Steps

**Phase A — Backend (`CollectorXRestAPI/CollectorAPI`)**

| # | Task | File | Notes |
|---|---|---|---|
| A1 | Response DTO | `Services/Loans/LoanSearchResultDto.cs` | `BankCode, LoanType, LoanCode, LoanName, Nic, Address, Balance` |
| A2 | `SearchLoansByName(bankCode, name, loanType?)` | `Services/Loans/LoanService.cs` | `BankCode`, `LoanStatus == 1`, `LoanName.Contains(term)`, optional `LoanType`; order name/type/code; `Take(50)`; project to DTO; trim term |
| A3 | `GET /loan-search` | `Handlers/Loans/LoanRouteHandler.cs` | Same bank-scope check as `/loan`; 400 on missing/short params; `[]` when no match; thin handler |
| A4 | Unit tests | `UnitTests/LoanServiceTests.cs` | See F1.4 |
| A5 | Docs | `CLAUDE.md`, `README.md` | Endpoint row |

No new DI registration, no DbContext or schema change.

**Phase B — Frontend (`loan-recovery`)**

| # | Task | File | Notes |
|---|---|---|---|
| B1 | Result type | `types/loan-search.ts` | Matches API contract |
| B2 | Proxy route | `app/api/loan-search/route.ts` | Copy `/api/employees`: `getSession()`, 401, forward params, `cache: "no-store"` |
| B3 | Results list | `components/loan-name-search-results.tsx` | Rows, muted NIC/address, "first 50" notice, empty/loading/error |
| B4 | Mode toggle + name input | `components/loan-search-form.tsx` | Leave code-search logic untouched; add "All types" |
| B5 | Live search | in B4 | 300 ms debounce, `AbortController`, min 3 chars, ignore aborted responses, clear on mode/bank change |
| B6 | Selection | in B3/B4 | `router.push('/dashboard?…')`, close list |
| B7 | Docs | `loan-recovery/CLAUDE.md` | Endpoint table |

`app/dashboard/page.tsx` needs **no change**.

## F1.3 Design Notes

- **Query:** `Loans.Where(bank && status==1 && name.Contains(term))` → optional type → `OrderBy(name).ThenBy(type).ThenBy(code)` → `Take(50)` → `Select`. Translates to a parameterised `LIKE '%term%'`.
- **Stale responses:** each keystroke resets a timer; when it fires the previous request is aborted and a new controller created; a response is applied only if its controller was not aborted.
- **Inline list, not dropdown:** dropdowns clip on small screens in the installed PWA and are harder to tap.

## F1.4 Test Plan

**Automated (xUnit, `LoanServiceTests.cs`):** contains match; case-insensitive (SQLite `LIKE`); excludes inactive; excludes other banks; loan type filter; ordering; 50-row cap; empty result.

**Manual (dev SQL Server):** 2 chars → no request; known customer → loans listed; same customer with 2 loans → adjacent rows; branch user other bank → API 400; Head Office bank `012` → only 012; fast typing on slow network → latest only; tap result → info card; inactive loan not listed; > 50 matches → 50 + notice; Sinhala/Tamil names and trailing spaces.

## F1.5 Estimate

| Phase | Task | Hours |
|---|---|---|
| A | DTO + service (A1–A2) | 1.5 |
| A | Endpoint + validation + scoping (A3) | 1.5 |
| A | Unit tests (A4) | 2 |
| A | Docs (A5) | 0.5 |
| B | Type + proxy (B1–B2) | 1 |
| B | Results component (B3) | 2.5 |
| B | Toggle, name input, live search, cancel (B4–B6) | 4.5 |
| B | Docs (B7) | 0.5 |
| C | Manual API + UI testing, fixes | 3.5 |
| C | Build, deploy, post-deploy checks | 1.5 |
| | Subtotal | 19 |
| | Contingency (~15%) | 3 |
| | **F1 total** | **≈ 22 h** |

**What would change it:** index on the name column if slow (+2–4 h, DBA approval, schema change); mixed scripts/collation problems (+2–3 h); NIC/phone search (+3–4 h); name kept in URL for back button (+1–2 h); grouping by obtainer instead of flat (+2 h); closed loans searchable (+1 h).

---

# Feature F2 — Record a Visit Outside the GPS Range

## F2.1 Approach

Keep the current RECORD VISIT gate exactly as is. When it is disabled, show a secondary **"Record visit outside range"** button that confirms and opens the same visit form. Add an `OutOfRange` column to `T_tblLoanVisit`. The **server** decides the flag on `POST /loan-visits` (override used, no tagged location, or more than 55 m from the tagged location), and never blocks a visit. The flag is shown as an amber badge on visit rows and in the detail popup.

## F2.2 Steps

Order matters: **database → backend → frontend**.

**Phase A — Database**

| # | Task | File | Notes |
|---|---|---|---|
| A1 | Add column | `LoanRecovery SQL/visit-outofrange-add.sql` | `ALTER TABLE dbo.T_tblLoanVisit ADD OutOfRange BIT NOT NULL CONSTRAINT DF_LoanVisit_OutOfRange DEFAULT 0`. Existing grants cover it. Run on dev first, then production **before** the API deploy |

**Phase B — Backend (`CollectorXRestAPI/CollectorAPI`)**

| # | Task | File | Notes |
|---|---|---|---|
| B1 | Entity + mapping | `Services/Visits/LoanVisit.cs`, `Database/Configurations/LoanVisitEntityTypeConfiguration.cs` | `bool OutOfRange` → `OutOfRange` |
| B2 | DTOs | `Services/Visits/LoanVisitDto.cs` | `CreateVisitRequest.OutOfRangeOverride` (default false); `OutOfRange` on list and detail DTOs |
| B3 | Flag logic | `Services/Visits/LoanVisitService.cs` `Create()` | Load loan's `LoanAddressLat/Lang`; null → flagged; else Haversine vs `VisitLat/VisitLang`; `OutOfRange = override \|\| noLocation \|\| distance > 55`. Constants defined once |
| B4 | Mappings | same file | Add the field in **three** places: `GetVisits` anonymous projection, `ToListDto`, `ToDetailDto`. Missing the projection would leave the list flag always false |
| B5 | Unit tests | `UnitTests/LoanVisitServiceTests.cs` (new) | See F2.4 |
| B6 | Docs | `CLAUDE.md`, `README.md` | Field + rule |

The route handler needs no change (it passes the request to the service).

**Phase C — Frontend (`loan-recovery`)**

| # | Task | File | Notes |
|---|---|---|---|
| C1 | Proxy pass-through | `app/api/loan-visits/route.ts` | Add `OutOfRangeOverride: body.outOfRangeOverride ?? false` — the POST builds the body field by field |
| C2 | Types | `types/loan-visit.ts` | `outOfRange: boolean` on list item and detail |
| C3 | Override button + confirm | `components/loan-visit-recorder.tsx` | Shown only when RECORD VISIT is disabled **and** a GPS position exists; confirm dialog; sets an `isOverride` state and opens the existing form; sends `outOfRangeOverride` |
| C4 | Save-time position | same file | On Save, `getCurrentPosition` (short timeout); fall back to the position captured at open; keep the "GPS could not be captured" error if neither exists |
| C5 | List badge | `components/loan-visit-list.tsx` | Amber "Outside range" for flagged rows |
| C6 | Detail popup | `components/loan-visit-detail-modal.tsx` | Show flag and recorded coordinates |

**Phase D — Verify & Release**

| # | Task | Notes |
|---|---|---|
| D1 | `dotnet test` | |
| D2 | `tsc --noEmit` | The build ignores TS errors, so check explicitly |
| D3 | Manual GPS testing | Chrome DevTools → Sensors to simulate position; see F2.4 |
| D4 | Release | **Run SQL → deploy API → deploy web**, then post-deployment checklist |

## F2.3 Design Notes

- **Why the server decides:** the API today trusts the client completely. A client-sent boolean can be forged or omitted, so the server recomputes from the loan's tagged location and the submitted position.
- **Why 55 m:** the client allows `25 m + min(accuracy, 30 m)`. The client does not send accuracy, so the server uses the fixed upper bound of 55 m. Sending accuracy would allow an exact match but adds a field and trust in a client value (CR OQ-9).
- **Flag, not block:** a rejected visit means a lost visit record and an angry officer in the field. Flagging preserves the record and the audit trail.
- **Save-time GPS:** the position is currently taken when the form opens; the officer may then spend minutes on statements and signatures. Re-reading at Save makes the stored coordinates match the moment of recording and keeps legitimate visits from being flagged by drift.
- **Not enforcement:** because the server does not block, anyone with the API can still post visits; the flag is an audit aid.

## F2.4 Test Plan

**Automated (new `LoanVisitServiceTests.cs`, SQLite in-memory; seed a loan with a tagged location):**
- Within 55 m, no override → `OutOfRange = false`
- Override = true within range → `true`
- Normal post 60 m away → `true` (server-decided)
- Boundary ≈ 55 m
- Loan without tagged location → `true`
- List and detail DTOs return the stored flag
- Guarantor/manager operations unaffected

**Manual (DevTools → Sensors, dev SQL Server):**

| Case | Expected |
|---|---|
| At the tagged location | Only RECORD VISIT visible |
| ~200 m away | RECORD VISIT disabled; override button shown; confirm → form → saved, badge on row |
| GPS blocked / off | Override unavailable, "GPS location required" |
| No tagged location | Override available; visit flagged |
| Override pressed, then Cancel on confirm | Nothing changes |
| Move away between opening the form and Save | Stored coordinates are the fresh position |
| Existing visits | Load normally, no badge |
| Guarantor signing on a flagged visit | Works; flag unchanged |

## F2.5 Estimate

| Phase | Task | Hours |
|---|---|---|
| A | SQL script, run on dev (A1) | 0.5 |
| B | Entity, config, DTOs, three mappings (B1, B2, B4) | 1.5 |
| B | Server distance + flag rule in `Create()` (B3) | 1.5 |
| B | New unit-test class (B5) | 2.5 |
| B | Docs (B6) | 0.5 |
| C | Proxy pass-through + types (C1–C2) | 0.5 |
| C | Override button, confirm dialog, override flow (C3) | 2.5 |
| C | Save-time position re-read (C4) | 1 |
| C | List badge + detail popup (C5–C6) | 1.5 |
| D | Manual GPS testing + fixes (D1–D3) | 2.5 |
| D | Deploy SQL + API + web, post-deploy checks (D4) | 1.5 |
| | Subtotal | 16 |
| | Contingency (~15%) | 2.5 |
| | **F2 total** | **≈ 18.5 h** |

**What would change it:**

| Factor | Effect |
|---|---|
| Allow visits with **no GPS at all** (nullable coordinates) | +4–6 h and a reporting change |
| Store the server-computed distance | +0.5–1 h, one extra column |
| Client sends GPS accuracy so the server matches the client rule exactly | +1 h |
| Capture a reason for overrides | +3–4 h |
| Manager approval workflow | +2–3 days, plus backoffice work |
| Server rejects clearly out-of-range "normal" visits | +1.5 h and regression risk |
| Show the flag in the separate backoffice app | separate project, not estimated |
| Skip the Save-time position re-read | −1 h |

---

# Feature F3 — Interest Installments Paid Tile

> **Status:** stored procedure **done and deployed** (returns `NoOfInterestPaid`). Nothing to do on the database. Remaining: API mapping and web tile.

## F3.1 Approach

`NoOfInstallmentsPaid` is calculated **inside** `usp_GetLoanSummaryReport`; the API copies it and the modal displays it. The interest count follows the same path, and its SP part is already delivered as the column **`NoOfInterestPaid`**. What remains:
1. The API reads `NoOfInterestPaid` from the SP result and exposes it.
2. The modal shows a new tile between **Principal Paid** and **Interest Paid**, renames the existing tile to "Principal Installments Paid", and lays the summary out in 7 columns at desktop width.

## F3.2 Steps

**Phase A — Database:** **done — no work.** Delivered script: `LoanRecovery SQL/CR20260920/LoanSummarySP.sql` (`ALTER PROCEDURE`, adds `NoOfInterestPaid` as the last output column). The stored procedure is not touched by this CR.

**Phase B — Backend (`CollectorXRestAPI/CollectorAPI`)**

| # | Task | File | Notes |
|---|---|---|---|
| B1 | Add property | `Services/Loans/LoanDetailReportDto.cs` | `int NoOfInterestPaid` on `LoanSummarySpResult` **and** `LoanSummaryDto`. On the SP result class the name **must equal the SP column exactly** (`NoOfInterestPaid`); a mismatch makes the read fail and the error is swallowed (blank summary) |
| B2 | Map it | `Services/Loans/LoanService.cs` `GetLoanDetailReport()` | `NoOfInterestPaid = summary.NoOfInterestPaid,` next to `NoOfInstallmentsPaid` (line ~168) |

**Phase C — Frontend (`loan-recovery`)**

| # | Task | File | Notes |
|---|---|---|---|
| C1 | Type | `types/loan-visit.ts` | `noOfInterestPaid: number` on `LoanSummary` |
| C2 | New tile + order | `components/loan-details-modal.tsx` (tile array, lines ~112–118) | Opening Principal · Principal Installments Paid · Principal Paid · **Interest Installments Paid** · Interest Paid · Penalty Paid · Loan Balance; value `summary?.noOfInterestPaid?.toString() ?? "—"` |
| C3 | Rename existing tile | same | "Installments Paid" → "Principal Installments Paid" |
| C4 | Grid + overflow tuning | same (grid at line ~111) | `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7`. The container is `max-w-5xl` (≈ 992 px), so each tile has ≈ 107 px of content width; `Rs. 1,234,567.00` in `text-sm` mono needs ≈ 134 px. Tune padding / value font / `Rs.` placement and verify with large amounts |
| C5 | Docs | `docs/cr-loan-details-popup.md` | Update the Loan Summary field list |

`app/api/loan-detail-report/route.ts` needs no change.

**Phase D — Verify & Release**

| # | Task | Notes |
|---|---|---|
| D1 | `dotnet build` / `dotnet test` | Confirms nothing else broke |
| D2 | `tsc --noEmit` | The build ignores TS errors, so check explicitly |
| D3 | API check | `GET /loan-detail-report` returns `summary.noOfInterestPaid` **and** the other summary fields still populated |
| D4 | Manual UI check | Widths 375 / 768 / 1024 / 1280 px with small and 7-digit amounts; compare the tile against `InterestPaid ÷ interest per installment` for a few real loans |
| D5 | Release | **API → web** (the SP is already in place); post-deployment checklist |

## F3.3 Design Notes

- **Name coupling:** EF maps stored-procedure results by column name. The API property must be `NoOfInterestPaid`, not the SP's internal variable `@NoOfInssPaid`.
- **Silent failure mode:** `GetLoanDetailReport` catches all exceptions. If the property name were wrong, or the API ran against a database without the updated SP, the summary read would fail and **every summary tile would show `—`** with nothing logged. Hence D3 checks that the other fields are still populated.
- **Safe today:** the already-deployed SP returns one extra column that the current API simply ignores, so the SP being ahead of the API is harmless.
- **Same source as the tile beside it:** the delivered SP uses `@TotalInterestPaid` (the value also returned as `InterestPaid`), so the count always agrees with the Interest Paid tile.
- **What it means:** like the principal count, it is a rounded ratio, not a count of payments. 2.5 installments' worth of interest shows as 3.

## F3.4 Test Plan

There are no automated tests: no tests cover the summary and SQLite cannot execute stored procedures.

**API (manual):** `GET /loan-detail-report` for a few loans — `summary.noOfInterestPaid` present; all other summary fields, `paymentHistory` and `totals` unchanged.

**UI (manual):**
- Tile appears between Principal Paid and Interest Paid, labelled "Interest Installments Paid"; existing tile reads "Principal Installments Paid"
- Value matches `ROUND(InterestPaid ÷ interest per installment)` for a loan with several full interest installments paid
- 0 for a loan with no payments and for a loan with no interest portion
- Interest part-paid or paid in advance: rounded value (noted for the client)
- All 7 tiles fit on one row at desktop with large amounts; wrap cleanly on mobile and tablet
- Other tiles, top amounts and payment history unchanged

## F3.5 Estimate

Remaining work only; the stored-procedure work is done.

| Phase | Task | Hours |
|---|---|---|
| B | DTO property + mapping (B1–B2) | 0.5 |
| C | Type, tile, rename (C1–C3) | 0.75 |
| C | 7-column grid and overflow tuning (C4) | 1.25 |
| C | Docs (C5) | 0.25 |
| D | Build, type-check, API and manual UI checks (D1–D4) | 1.25 |
| D | Deploy API + web (D5) | 0.5 |
| | Subtotal | 4.5 |
| | Contingency (~15%) | 0.75 |
| | **F3 total (remaining)** | **≈ 5.25 h** |

**What would change it:**

| Factor | Effect |
|---|---|
| Interest is not fixed per installment for some loan types (CR OQ-10) | +2–4 h per special rule (would need an SP change, which is out of this CR) |
| Tiles cannot fit at 7 columns without a redesign | +1–2 h |
| Skip the layout tuning and accept overflow | −1 h (not recommended) |

---

# Feature F4 — Loan Note Type (Mode)

## F4.1 Approach

Read `LoanRecord_Mode` with each note, resolve the distinct modes through `M_tblLoanRecTypes` in one small, **isolated** query (so a failure degrades and is logged instead of breaking the page), add `mode` to each note in the API response, and show it as a label on the date line in the Loan Notes accordion. A one-line SQL grant gives the API's login read access to the new table.

## F4.2 Steps

Order matters: **grant → backend → frontend**.

**Phase A — Database**

| # | Task | File | Notes |
|---|---|---|---|
| A1 | Grant script | `LoanRecovery SQL/CR20260920/loanrectypes-grant.sql` | `GRANT SELECT ON [dbo].[M_tblLoanRecTypes] TO [<API login>]` — existing scripts use `codexpublec`; confirm the real login (CR OQ-14). Run on dev, then production, before the API deploy. Table structure is not changed |

**Phase B — Backend (`CollectorXRestAPI/CollectorAPI`)**

| # | Task | File | Notes |
|---|---|---|---|
| B1 | Type entity + config + DbSet | `Services/Loans/LoanRecType.cs`, `Database/Configurations/LoanRecTypeEntityTypeConfiguration.cs`, `Database/CollectorDBContext.cs` | Table `M_tblLoanRecTypes`; key `ID` as `decimal(13,0)` with no value generation; `lrDescription` max 80 |
| B2 | Mode on the note entity | `Services/Loans/LoanRecord.cs`, `Database/Configurations/LoanRecordEntityTypeConfiguration.cs` | `int LoanRecordMode` ← `LoanRecord_Mode` |
| B3 | DTO | `Services/Loans/LoanDetailDto.cs` | `string? Mode` on `LoanNoteDto` |
| B4 | Service | `Services/Loans/LoanService.cs` `GetLoanDetails()` | Notes query keeps its filters and takes 5; add the mode to the projection; resolve descriptions for the distinct modes in a `try/catch` that logs a warning; trim; unmatched → null. Add an **optional** `ILogger<LoanService>? logger = null` constructor parameter |
| B5 | Unit tests | `UnitTests/LoanServiceTests.cs` | See F4.4 |
| B6 | Docs | `CLAUDE.md`, `README.md` | Field |

`ServiceRegister.cs` needs no change (`AddScoped<LoanService, LoanService>()` still works; DI supplies the logger).

**Phase C — Frontend (`loan-recovery`)**

| # | Task | File | Notes |
|---|---|---|---|
| C1 | Type | `types/loan-visit.ts` | `mode: string \| null` on `LoanNote` |
| C2 | Label on the date line | `components/loan-visits-accordion.tsx` (notes loop, lines ~128–140) | Render the label beside the date only when `note.mode` is present; muted style; wraps on narrow widths |

**Phase D — Verify & Release**

| # | Task | Notes |
|---|---|---|
| D1 | `dotnet test`, `tsc --noEmit` | The build ignores TS errors, so type-check explicitly |
| D2 | Manual check on the dev database | Loans whose notes have several different modes; a loan with no notes; a note whose mode has no type row (if one exists) |
| D3 | Degrade check | Covered by the unit test; on the dev server optionally confirm the log warning appears if the grant is withheld |
| D4 | Release | **Grant → API → web**, then the post-deployment checklist |

## F4.3 Design Notes

- **Separate lookup, not a join.** A join inside the notes query would fail the whole query if the type table were unreadable. A separate query for at most 5 distinct ids can be wrapped on its own, so the notes are never lost. The extra round trip is negligible.
- **`decimal` cast.** `M_tblLoanRecTypes.ID` is `numeric(13,0)`; the mode is an `int`. The id list is cast to `decimal` before the `Contains`.
- **Optional logger.** `LoanService` has no logger today, and the tests call `new LoanService(Db)`. An optional constructor parameter keeps the tests compiling and DI still injects it. Warnings go to the API console log (`journalctl -u collectorapi`).
- **Log noise.** If the grant is permanently missing, every visits-page load logs one warning. That is intentional: it keeps the problem visible while the page keeps working.
- **Nullability assumption.** The client confirmed `LoanRecord_Mode` is not null, so the entity property is a plain `int`. If real data had nulls, EF would throw when reading the note; confirm the column is `NOT NULL` (CR OQ-15).

## F4.4 Test Plan

**Automated (xUnit, `LoanServiceTests.cs`; SQLite creates the new table from the EF model):**
- Notes for a loan return `Mode` text matching each note's mode
- A mode with no type row → `Mode` is null, note still returned
- Blank or padded description → trimmed / null
- Notes selection unchanged: filters, order, limit of 5
- Failure tolerance: drop the type table in the test database, then call `GetLoanDetails()` → notes still returned with `Mode` null, no exception

**Manual:**
- Visits page for loans with notes of different modes shows the right labels
- Label wraps cleanly at 375 px with a long description
- Loan with no notes still shows "No notes on record."
- Other accordion sections unchanged

## F4.5 Estimate

| Phase | Task | Hours |
|---|---|---|
| A | Grant script; apply on dev (A1) | 0.25 |
| B | Type entity, config, DbSet (B1) | 0.5 |
| B | Mode on `LoanRecord` + config (B2) | 0.25 |
| B | DTO + service change with isolated lookup and logging (B3–B4) | 1.25 |
| B | Unit tests, including the failure case (B5) | 1.5 |
| B | Docs (B6) | 0.25 |
| C | Type + accordion label (C1–C2) | 1 |
| D | Type-check and manual checks (D1–D3) | 0.75 |
| D | Deploy grant + API + web (D4) | 0.5 |
| | Subtotal | 6.25 |
| | Contingency (~15%) | 1 |
| | **F4 total** | **≈ 7.25 h** |

**What would change it:**

| Factor | Effect |
|---|---|
| `LoanRecord_Mode` turns out to be nullable, or not an integer type | +0.5–1 h |
| Other places (for example the loan details popup) should also show notes with the type | +2–3 h per screen |
| Client wants the type text to filter or group notes | +3–4 h |
| Skip the degrade path (fail loudly instead) | −1 h |
| Permission grant needs a DBA change process | elapsed time, not effort |

---

# Feature F5 — Member Share in the Loan Details Section

## F5.1 Approach

The API entity (`Member.MemberShare`) and its configuration (`Member_Shere`) were already done. Work: add `MemberShare` to `LoanDetailDto`, look it up for the loan obtainer in `GetLoanDetails()` (the members table is already read there for guarantors), add `memberShare` to the frontend type, and show one row in the Loan Details section of the visits page sidebar. No database work: `M_tblMember` is already read and `SELECT` is granted at table level.

## F5.2 Steps

**Phase A — Database:** none.

**Phase B — Backend (`CollectorXRestAPI/CollectorAPI`)**

| # | Task | File | Notes |
|---|---|---|---|
| B0 | *(done)* Entity property + column mapping | `Services/Loans/Member.cs`, `MemberEntityTypeConfiguration.cs` | Already in place |
| B1 | Column type for consistency | `MemberEntityTypeConfiguration.cs` | Add `.HasColumnType("decimal(19,4)")` (optional but recommended; avoids the EF default-type warning) |
| B2 | DTO | `Services/Loans/LoanDetailDto.cs` | `decimal? MemberShare` on `LoanDetailDto` |
| B3 | Service | `Services/Loans/LoanService.cs` `GetLoanDetails()` | Look up by bank code + `loan.MemberId`; null when `MemberId` is empty or no row; set `MemberShare` in the returned DTO |
| B4 | Unit tests | `UnitTests/LoanServiceTests.cs` | See F5.4 |
| B5 | Docs | `CLAUDE.md`, `README.md` | Field |

**Phase C — Frontend (`loan-recovery`)**

| # | Task | File | Notes |
|---|---|---|---|
| C1 | Type | `types/loan-visit.ts` | `memberShare: number \| null` on `LoanDetail` |
| C2 | Loan Details row | `components/loan-visits-accordion.tsx` (Loan Details section, below Address) | Render only when `detail.memberShare != null`; local two-decimal formatter `fmtShare` (`fmtCurrency` allows up to 3 decimals). *Originally planned for the Customer card in `visits/page.tsx`; that card no longer exists after the page redesign* |

**Phase D — Verify & Release**

| # | Task | Notes |
|---|---|---|
| D1 | `dotnet test`, `tsc --noEmit` | The build ignores TS errors, so type-check explicitly |
| D2 | Manual check on the dev database | A loan with a positive share, one with 0, one with no member row or empty `Loan_Mem1`; check at 375 px width |
| D3 | Release | **API → web**; no database step |

## F5.3 Design Notes

- **Existing lookup pattern.** `GetLoanDetails()` already queries `Members` for the guarantors with `StoresNo == bankCode && MemberNo == id`. The obtainer's lookup uses the same key, so tenant scoping is identical.
- **Only the share is projected.** The query selects just `MemberShare`, so it is cheap and does not depend on other member columns.
- **No new permission.** Unlike F4, the table is already read and granted; the new column is covered by the table-level `SELECT`.
- **Entity already deployed-safe.** The added `MemberShare` property is only read when a query selects it. Nothing selects it until B3, so deploying the entity change alone is harmless.
- **Assumption.** `Loan_Mem1` holds the obtainer's member number (it is what the employee loan report calls `MemberId`). See CR OQ-17.

## F5.4 Test Plan

**Automated (xUnit, `LoanServiceTests.cs`; seed a loan and members):**
- Loan whose obtainer has a share → `MemberShare` equals it
- Share of 0 → returned as 0 (not null)
- Null share → null
- Empty `Loan_Mem1` or no matching member → null
- Same member number in another bank → not used

`GetLoanDetails()` also calls a stored procedure through `SqlQueryRaw`. In SQLite that call fails and is swallowed by the method's existing `catch`, leaving the arrears fields null, so it should not block these tests; confirm when writing them.

**Manual:** the Loan Details section of the visits page sidebar shows the row for a loan with a share, shows `LKR 0.00` for zero, and omits it when there is no value; other sections unchanged; no overflow at 375 px. (The section is collapsed by default — expand it.)

## F5.5 Estimate

| Phase | Task | Hours |
|---|---|---|
| B | DTO, service lookup, column-type tweak (B1–B3) | 0.75 |
| B | Unit tests (B4) | 1 |
| B | Docs (B5) | 0.25 |
| C | Type + Loan Details row (C1–C2) | 0.75 |
| D | Type-check and manual checks (D1–D2) | 0.75 |
| D | Deploy API + web (D3) | 0.5 |
| | Subtotal | 4 |
| | Contingency | 0.5 |
| | **F5 total** | **≈ 4.5 h** |

The entity and configuration work already done is not included.

**What would change it:**

| Factor | Effect |
|---|---|
| Also show guarantors' shares (client chose obtainer only) | +1.5 h |
| `Loan_Mem1` is not the obtainer's member number, or the link needs another key | +1–2 h |
| Show the share on the View Loan Details popup or the dashboard loan card | +1–2 h per screen |
| A different display format (for example 4 decimals) | −0 h, trivial |

## F5.6 Implementation Result

**Status: implemented on 2026-09-20; not yet deployed.**

**What was built**

| File | Change |
|---|---|
| `CollectorAPI/Database/Configurations/MemberEntityTypeConfiguration.cs` | `Member_Shere` now also has `HasColumnType("decimal(19,4)")` |
| `CollectorAPI/Services/Loans/LoanDetailDto.cs` | `decimal? MemberShare` |
| `CollectorAPI/Services/Loans/LoanService.cs` | `GetLoanDetails()` looks up the share by bank code + `loan.MemberId` (null when `MemberId` is empty or no row) and returns it |
| `CollectorAPI.Tests/UnitTests/LoanServiceTests.cs` | 6 new tests: share present, zero, null share, no matching member, empty member id, same member number in another bank |
| `loan-recovery/types/loan-visit.ts` | `memberShare: number \| null` on `LoanDetail` |
| `loan-recovery/components/loan-visits-accordion.tsx` | "Member Share" row in the Loan Details section below Address, shown only when not null, `LKR` with two decimals |

**Deviation from the plan.** The visits page was redesigned after F5 was planned: the Customer card (name, NIC, address, phones) is gone and the phone numbers are no longer displayed anywhere. The row therefore went into the sidebar's **Loan Details** section, the only place the address is shown. That section is collapsed by default (the open sections are Repayment Details and Guarantors).

**Verification**
- The API project builds.
- The 6 new tests pass.
- `tsc --noEmit`: 0 errors across the whole frontend project.
- **Not verified in a browser or against the real database** (needs the API, the SQL Server dev database and a login). Still to do: manual check on real loans (positive share, zero, no member) and confirmation that `Loan_Mem1` is the obtainer's member number (CR OQ-17).

**Existing problems found in the test project (not touched)**
- `AuthServiceTests.cs` does not compile: five calls to `new GeneralLogin(...)` omit the required `bankCode` argument, so `dotnet test` fails for the whole test project. The new tests were run from a temporary copy that leaves that file out.
- Five older tests fail: `GetLoans_ValidCompositeKey_ReturnsLoan`, `GetLoans_MultipleLoans_ReturnsCorrectOne`, `UpdateLoan_ExistingLoan_ReturnsUpdatedLoan`, `UpdateLoan_PersistsCoordinatesToDatabase`, `UpdateLoan_OverwritesPreviousCoordinates`. The service only returns loans with `LoanStatus == 1`, but their `SeedLoan` helper never sets a status, so the loan comes back null.

---

# Release Plan (all features)

**Order:** F2 database script and F4 SQL grant → API → web. F3's stored procedure is already deployed. All API changes are additive.
- **F2:** the new column must exist before the API is deployed, because EF selects it in every visit query.
- **F3:** the SP is already updated; every environment the API is deployed to must already have it (the API reads `NoOfInterestPaid`), otherwise the summary silently goes blank.
- **F4:** the API's SQL login needs `SELECT` on `M_tblLoanRecTypes`. If the grant is missing the API still works — notes appear without the type label and a warning is logged — but the feature does nothing until it is applied.
- **F5:** no database step — `M_tblMember` is already read and granted. API → web.
- **F1:** no database step.

If released together, the deploy and the final regression pass are done once (≈ 3 h saved across five features). If released separately, F1, F3 and F5 need no database step (F3's is done); F2 needs a database script and F4 a permission grant first.

Build notes: on this machine run the Next.js dev server under Node 22 (Node 24 crashed compiling middleware). Windows release build uses `npm` (per `Docs/RELEASE.md`).

# Risks & Mitigations

| Risk | Feature | Mitigation |
|---|---|---|
| Leading-wildcard `LIKE` scans the branch's loans | F1 | Bank code required, ≥ 3 chars, debounce, 50-row cap; measure; index only if needed |
| Live search load from many officers | F1 | Debounce + cancel; monitor logs |
| API deployed before the column exists → all visit reads fail | F2 | Fixed release order; verify the column on production first |
| Proxy silently drops the override field | F2 | Explicit task C1 and a manual test that an override visit saves flagged |
| Server flag disagrees with what the officer saw | F2 | Save-time position re-read; fixed 55 m equals the client's maximum |
| Flag list mapping missed in one of three places | F2 | Task B4 plus unit tests on list and detail |
| SQLite tests pass but SQL Server differs | F1, F2 | Manual testing on the dev SQL Server |
| Regression in code search or normal visit recording | F1, F2 | Existing paths left untouched; explicit acceptance criteria S-AC-14, V-AC-1, V-AC-14 |
| API deployed to a database without the updated SP → summary blank, error swallowed | F3 | Confirm the updated SP is in every target database first (script has `USE [Bank]`); step D3 checks the other summary fields still populate |
| API property name differs from the SP column `NoOfInterestPaid` → read fails silently | F3 | Note on B1; D3 API check |
| Ratio misleads for advance, part-paid or non-fixed interest | F3 | Documented; SSMS test cases; confirm OQ-10 with the client |
| 7 columns overflow for large amounts at `max-w-5xl` | F3 | Task C4 tuning; D3 check at 375/768/1024/1280 px with 7-digit amounts |
| No automated coverage of the summary | F3 | Manual API and UI checks on real loans |
| SQL login lacks `SELECT` on `M_tblLoanRecTypes` → no type labels | F4 | Grant script in phase A; lookup isolated in `try/catch` so notes still show; warning logged; confirm the login (OQ-14) |
| Type lookup failure breaks the whole visits page | F4 | Separate lookup query with its own error handling, not a join; covered by a unit test that drops the table |
| `LoanRecord_Mode` is nullable in the real database | F4 | Confirm the column definition before coding (OQ-15) |
| Adding a logger breaks existing tests | F4 | Optional constructor parameter; `new LoanService(Db)` keeps working |
| Wrong member link shows another member's share or nothing | F5 | Confirm `Loan_Mem1` is the obtainer's member number (OQ-17); manual check with real loans; bank-scoped lookup |
| Precision or default-decimal warning on `Member_Shere` | F5 | Add `HasColumnType("decimal(19,4)")` (task B1); values are small, display is rounded to 2 decimals |

# Definition of Done

- All acceptance criteria (S-AC-1…14, V-AC-1…14, I-AC-1…10, N-AC-1…8, M-AC-1…7) in `CR-20260920.md` pass
- `dotnet test` green; `tsc --noEmit` clean for changed files
- Manually verified on the dev SQL Server at mobile and desktop widths, including simulated GPS for F2 and large amounts for F3
- Endpoints/fields documented in both CLAUDE.md files; `docs/cr-loan-details-popup.md` updated for F3
- F2 database script and F4 SQL grant run on production, then API, then web (F3's SP is already deployed); post-deployment checklist ticked
- Open questions OQ-4, OQ-5, OQ-6, OQ-7, OQ-10, OQ-12, OQ-13, OQ-14, OQ-15, OQ-17 answered or explicitly waived

# Open Items Before Starting

1. DBA / client: loans per bank and collation of `LOan_Name1` (OQ-4, OQ-5).
2. Client: confirm active-only, name-only search scope (OQ-1, OQ-2).
3. Client: confirm the Save-time GPS re-read (OQ-6) and that storing the distance is not wanted (OQ-7).
4. Confirm whether the backoffice team will show the new flag (OQ-8).
5. Client / DBA: is the interest portion of each installment fixed for every loan type (OQ-10)?
6. DBA: confirm which databases already have the updated SP — the script has `USE [Bank]`, while the dev database in the project notes is `Bank_new` (OQ-13).
7. Product: acceptable to tighten tile padding / font at 7 columns if large amounts do not fit (OQ-12)?
8. DBA: confirm the API's SQL login and that it has (or will get) `SELECT` on `M_tblLoanRecTypes`; confirm `LoanRecord_Mode` is a `NOT NULL` integer column (OQ-14, OQ-15).
9. Client / DBA: confirm `Loan_Mem1` is the loan obtainer's member number (OQ-17).
10. Target release date, and whether F1 to F5 ship together.
