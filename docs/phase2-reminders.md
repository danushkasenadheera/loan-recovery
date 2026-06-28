# Phase 2 — Loan Reminders Spec
## HDC Coop Bank · Loan Recovery System

---

## Overview

Field officers can attach personal reminders to any loan. Reminders have a date and a text message. The header shows a live count of today's + overdue unattended reminders. Reminders are owned per-user — one officer's reminders are not visible to another unless viewing the loan-level "All" tab.

**New in Phase 2:** database table, CollectorX API endpoints, three Next.js API proxy routes, and client-side UI components (modal + header popup). No new pages — everything surfaces in modals and the existing header.

---

## Features

| # | Feature | Description |
|---|---|---|
| 1 | Add reminder | Officer adds a date + message reminder against a loan for themselves |
| 2 | Edit reminder | Officer can edit date or message of their own reminders |
| 3 | Delete reminder | Officer can soft-delete their own reminders |
| 4 | Upcoming view | Default tab: current user's unattended reminders (past overdue + future), ascending date, max 50 |
| 5 | All mine view | Second tab: all of the current user's reminders for that loan (any status/date), descending, max 50 |
| 6 | All loan view | Third tab: every user's reminders for that loan (admin insight), descending, max 50 |
| 7 | Header count | Badge in dashboard header shows count of today's + overdue unattended reminders for the logged-in user |
| 8 | Header popup | Clicking the badge opens a popup list of those reminders with checkboxes |
| 9 | Mark attended | Checking a reminder in the popup marks it attended — it disappears from the popup and count decreases |
| 10 | Reminder status | Each reminder in the loan modal shows its status: Pending / Attended (with attended date) |

---

## Reminder States

| State | Condition | Display |
|---|---|---|
| **Pending** | `isAttended = false`, date is today or future | Normal style |
| **Overdue** | `isAttended = false`, date is in the past | Highlighted (e.g. amber/red) |
| **Attended** | `isAttended = true` | Muted, struck-through text, attended date shown |

---

## Header Reminder Badge

- **Count** = current user's reminders where `isAttended = false` AND `reminderDate <= today`
  - Includes today's reminders + any overdue (past unattended) reminders
- **Fetch strategy**: client-side on dashboard mount, re-fetched after any attend action
- **Popup contents**: the same reminder set (today + overdue unattended), ordered by date ascending
- **Actions in popup**: checkbox only → marks attended. No add/edit/delete from here.
- **After marking attended**: reminder disappears from popup instantly, badge count decrements

### Popup row layout

Each row shows two lines plus a checkbox:

```
☐  Call borrower to confirm repayment
   Branch 012 — PL / 00000028          ← tappable link
```

- **Line 1**: reminder message text
- **Line 2**: loan identifier in muted style — `Branch {bankCode} — {loanType} / {loanCode}` — rendered as a link to `/dashboard?BankCode={bankCode}&LoanType={loanType}&LoanCode={loanCode}`; clicking navigates to the dashboard with that loan pre-loaded and closes the popup
- **Checkbox**: on the right; checking marks the reminder attended and removes it from the list

---

## Loan Reminder Modal

Triggered by a **"Reminders"** button in `LoanInfoCard`, next to the existing "Tag Location" button.

### Tabs

| Tab | Label | Contents | Order | Limit |
|---|---|---|---|---|
| 1 | Upcoming | Current user's unattended reminders for this loan (any date ≤ today unattended + future) | Date ascending | 50 |
| 2 | All Mine | All of the current user's reminders for this loan (any status, any date) | Date descending | 50 |
| 3 | All | Every user's reminders for this loan | Date descending | 50 |

### Actions (available on tabs 1 + 2 only)

- **Add reminder** — form with date picker + text message field, saves against current user
- **Edit reminder** — inline or in a form, only the user's own reminders
- **Delete reminder** — soft delete; confirmation required
- **Mark attended** — available on unattended reminders in Upcoming/All Mine tabs

### Reminder row display

Each row shows:
- Date (formatted: DD MMM YYYY)
- Message text
- Status badge: `Pending` / `Overdue` / `Attended`
- Attended date (if attended)
- Edit / Delete icons (own reminders only; not shown on All tab)

---

## Database

### New table: `T_tblLoanReminder`

```sql
CREATE TABLE T_tblLoanReminder (
    Id              INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    BankCode        NVARCHAR(10)    NOT NULL,
    LoanType        NVARCHAR(20)    NOT NULL,
    LoanCode        NVARCHAR(20)    NOT NULL,
    UserId          INT             NOT NULL,
    ReminderDate    DATE            NOT NULL,
    Message         NVARCHAR(500)   NOT NULL,
    IsAttended      BIT             NOT NULL DEFAULT 0,
    AttendedAt      DATETIME        NULL,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME        NULL
);

CREATE INDEX IX_LoanReminder_Loan
    ON T_tblLoanReminder (BankCode, LoanType, LoanCode);

CREATE INDEX IX_LoanReminder_User
    ON T_tblLoanReminder (UserId, IsAttended, ReminderDate);
```

**Notes:**
- `UserId` references the authenticated user's id from the JWT (`userId` claim)
- Deleted reminders are hard-deleted — no soft delete, no `IsDeleted` column
- `AttendedAt` is set server-side when `IsAttended` is flipped to true

---

## CollectorX API Endpoints

All endpoints require `Authorization: Bearer <token>`.  
`UserId` is always extracted from the JWT — never trusted from the request body.

### GET `/reminders`

Returns reminders for a specific loan.

**Query params:**

| Param | Required | Description |
|---|---|---|
| `BankCode` | Yes | Loan bank code |
| `LoanType` | Yes | Loan type |
| `LoanCode` | Yes | Loan code |
| `Scope` | Yes | `upcoming` \| `all` \| `loan` |

**Behaviour by scope:**

| Scope | Filter | Order | Limit |
|---|---|---|---|
| `upcoming` | Current user, `IsAttended=false`, `IsDeleted=false` | Date asc | 50 |
| `all` | Current user, `IsDeleted=false` | Date desc | 50 |
| `loan` | All users, `IsDeleted=false` | Date desc | 50 |

**Response:** `ReminderDto[]`

```json
[
  {
    "id": 1,
    "bankCode": "012",
    "loanType": "PL",
    "loanCode": "00000028",
    "userId": 5,
    "userName": "John",
    "reminderDate": "2026-06-25",
    "message": "Call borrower to confirm repayment",
    "isAttended": false,
    "attendedAt": null,
    "createdAt": "2026-06-21T10:00:00"
  }
]
```

---

### GET `/reminders/today`

Returns the current user's unattended reminders where `ReminderDate <= today` (today + overdue).  
Used for the header badge count.

**Response:** `ReminderDto[]`

---

### POST `/reminders`

Creates a new reminder for the current user.

**Request body:**

```json
{
  "bankCode": "012",
  "loanType": "PL",
  "loanCode": "00000028",
  "reminderDate": "2026-06-25",
  "message": "Call borrower to confirm repayment"
}
```

**Response:** Created `ReminderDto`

---

### PUT `/reminders/{id}`

Updates the date and/or message of a reminder. API returns `403` if the `UserId` from the JWT does not match the reminder's `UserId`.

**Request body:**

```json
{
  "reminderDate": "2026-06-28",
  "message": "Updated message"
}
```

**Response:** Updated `ReminderDto`

---

### PUT `/reminders/{id}/attend`

Marks a reminder as attended. Sets `IsAttended = true`, `AttendedAt = now`.  
Only the owning user can attend their own reminder.

**Request body:** none  
**Response:** Updated `ReminderDto`

---

### DELETE `/reminders/{id}`

Hard-deletes the reminder row. API returns `403` if the `UserId` from the JWT does not match the reminder's `UserId`.

**Response:** `{ "success": true }`

---

## Next.js API Proxy Routes

All proxy routes read the session cookie, extract `authToken`, and forward to CollectorX.

| Method | Next.js Route | Proxies to |
|---|---|---|
| GET | `/api/reminders?BankCode=&LoanType=&LoanCode=&Scope=` | `GET /reminders` |
| GET | `/api/reminders/today` | `GET /reminders/today` |
| POST | `/api/reminders` | `POST /reminders` |
| PUT | `/api/reminders/[id]` | `PUT /reminders/{id}` |
| PUT | `/api/reminders/[id]/attend` | `PUT /reminders/{id}/attend` |
| DELETE | `/api/reminders/[id]` | `DELETE /reminders/{id}` |

---

## Component Architecture

All reminder components are `"use client"` — they involve dynamic counts, user interactions, and optimistic UI updates.

### New files

| File | Type | Purpose |
|---|---|---|
| `components/reminder-badge.tsx` | Client | Header badge — fetches `/api/reminders/today`, shows count, renders `TodayRemindersPopup` |
| `components/today-reminders-popup.tsx` | Client | Dropdown popup with today's + overdue reminders, checkbox to attend |
| `components/loan-reminders-modal.tsx` | Client | Full modal with 3 tabs, add/edit/delete, fetches per tab on demand |
| `components/reminder-form.tsx` | Client | Add/edit form: date input + textarea, used inside the modal |
| `app/api/reminders/route.ts` | API Route | GET (list) + POST (create) |
| `app/api/reminders/today/route.ts` | API Route | GET today + overdue |
| `app/api/reminders/[id]/route.ts` | API Route | PUT (update) + DELETE |
| `app/api/reminders/[id]/attend/route.ts` | API Route | PUT attend |

### Modified files

| File | Change |
|---|---|
| `components/dashboard-header.tsx` | Add `<ReminderBadge userId={user.id} />` next to network indicator |
| `components/loan-info-card.tsx` | Add "Reminders" button next to "Tag Location", renders `<LoanRemindersModal>` |

---

## UI Flow

```
Dashboard loads
  └── DashboardHeader mounts
        └── ReminderBadge fetches /api/reminders/today
              ├── count > 0 → shows badge with number
              └── User clicks badge
                    └── TodayRemindersPopup opens
                          ├── Lists reminders (message + loan link per row)
                          ├── User taps loan link → navigates to dashboard with loan loaded
                          └── User checks a reminder
                                └── PUT /api/reminders/{id}/attend
                                      └── Reminder disappears, count --

User searches loan → LoanInfoCard renders
  └── "Reminders" button clicked
        └── LoanRemindersModal opens (default: Upcoming tab)
              ├── Upcoming tab → GET /api/reminders?Scope=upcoming
              ├── All Mine tab → GET /api/reminders?Scope=all
              ├── All tab → GET /api/reminders?Scope=loan
              ├── Add button → ReminderForm → POST /api/reminders
              ├── Edit icon → ReminderForm (prefilled) → PUT /api/reminders/{id}
              ├── Delete icon → confirm → DELETE /api/reminders/{id}
              └── Attend checkbox → PUT /api/reminders/{id}/attend
```

---

## Reminder Status Derivation (client-side)

```ts
function getReminderStatus(reminder: Reminder): "pending" | "overdue" | "attended" {
  if (reminder.isAttended) return "attended"
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const date = new Date(reminder.reminderDate)
  return date < today ? "overdue" : "pending"
}
```

---

## Shadcn Components Needed

The following Shadcn components are not yet installed and will be needed:

| Component | Usage |
|---|---|
| `dialog` | LoanRemindersModal wrapper |
| `tabs` | Upcoming / All Mine / All tabs |
| `popover` | TodayRemindersPopup anchor |
| `checkbox` | Attend action in popup + modal |
| `textarea` | Reminder message input in ReminderForm |
| `badge` (already present) | Status badge on each reminder row |
| `separator` (already present) | Visual dividers in modal |

Install command:
```bash
pnpm dlx shadcn@latest add dialog tabs popover checkbox textarea
```

---

## What is NOT in Phase 2

- Push notifications or scheduled alerts (reminder is a UI-only list)
- Reminder sharing between users
- Recurring reminders
- Reminder categories or priority levels
- Any changes to the Android mobile app

---

## Phase 2 Scope Summary

**In:** Loan reminder CRUD, header badge with today/overdue count, today popup with attend action, loan modal with 3-tab reminder list, new DB table + 6 API endpoints.  
**Out:** Push notifications, reminders visible across users (except the All tab), mobile app changes.
