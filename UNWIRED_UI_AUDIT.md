# RoundFlow — What the Frontend Needs From the Backend

**Date:** 2026-10-07
**For:** Backend
**What this is:** A list of buttons in the app that currently **do nothing real** — they show a success message but never call the backend, because the endpoint doesn't exist yet. This doc is organised by **the backend feature that needs building**, so you can see exactly what each one should do, who calls it, and a suggested request/response.

Paths/payloads below are **suggestions** following the app's existing style (e.g. `POST /debt/:invoiceId/remind`). Final contract is yours — the frontend will match whatever you ship.

---

## Summary — 4 missing backend features cause almost everything

| # | Missing feature | How many buttons it unblocks | Priority |
|---|---|---|---|
| 1 | Customer messaging (SMS/email send) | 5 | High |
| 2 | Invoice PDF (download + print) | 4 | High |
| 3 | Payment provider connect (GoCardless/Stripe OAuth) | 4 | Medium |
| 4 | Reports export | 1 | Low |

Everything else in the app is already wired to real endpoints and works. The rest of this doc details these four, then lists a few **frontend-only** dead controls that are **not** your job.

---

## 1. Customer messaging (SMS / email)

**Problem:** There is no endpoint to send a message to a customer. Every "Send" button below just pops a success toast and sends nothing.

**Buttons that depend on this (all currently fake):**

| Screen | Button | File |
|---|---|---|
| Round Planner → Bulk Message | **Send** | `src/components/dashboard/BulkMessageModal.tsx:54` (also opened from sidebar "Bulk Message" and Round Planner "Bulk Message Round") |
| Round Planner → Message Customers | **Send** | `src/components/round-planner/MessageCustomersModal.tsx:57` |
| Property Detail → Send Message | **Send SMS / Email** | `src/components/property-detail/SendPropertyMessageModal.tsx:72` |
| Round Planner → Weather Hold | **Apply Weather Hold** (the "notify customers" part) | `src/components/round-planner/WeatherHoldModal.tsx:45` |
| Settings → SMS Templates | (whole panel is read-only until this ships) | `src/components/settings/SettingsScreen.tsx:731` |

**What the UI already collects** (so you know the inputs):
- **Bulk / round message:** `roundId`, `channel` (`SMS` | `WhatsApp`), message `body`, `excludePaymentHold` (bool), send `now` vs scheduled. Needs a way to resolve a round → its recipients.
- **Single property message:** `propertyId` (or `customerId`), `channel` (`sms` | `email`), `body`.

**Suggested endpoints:**
```
POST /messages/send            # one customer
  body: { propertyId, channel: "sms"|"email", body }
  res:  { messageId, status }

POST /messages/bulk            # a whole round
  body: { roundId, channel: "sms"|"whatsapp", body, excludePaymentHold: bool, sendAt?: ISO }
  res:  { queued: number }     # how many recipients it went to
```

**Also needed for SMS Templates** to become editable (currently returns a "deferred" stub):
```
GET  /settings/message-templates           -> [{ id, name, channel, body }]
PUT  /settings/message-templates/:id        body: { body }
```

---

## 2. Invoice PDF — download & print

**Problem:** "Download PDF" and "Print" just toast "downloaded" / "sent to printer" and produce no file.

**Buttons (all fake):**

| Screen | Button | File |
|---|---|---|
| Invoice modal (used in Property Detail tabs **and** the Debt board) | **Download PDF** | `src/components/property-detail/SavedInvoiceModal.tsx:130` |
| Invoice modal (same) | **Print** | `src/components/property-detail/SavedInvoiceModal.tsx:108` |
| Invoice preview | **Download PDF** / **Print** | `src/components/property-detail/InvoicePreviewModal.tsx:114` / `:89` |

> Note: the **Send** button next to these is already wired (`useSendInvoice`). Only PDF/print are missing.

**Suggested endpoint:**
```
GET /invoices/:invoiceId/pdf
  res: application/pdf  (or { url } to a signed download link)
```
Frontend will open/download it for "Download PDF", and open it in a print view for "Print".

---

## 3. Payment provider connect (GoCardless / Stripe)

**Problem:** The "Connect" buttons flip a boolean and show "Connected" — there is no real OAuth. In Settings it calls an endpoint you've already marked as a **Phase-1 stub that returns no connect URL**.

**Buttons (fake / stub):**

| Screen | Button | File |
|---|---|---|
| Setup Wizard → Payment Setup | **Connect / Disconnect GoCardless & Stripe** | `src/components/setup-wizard/steps/PaymentSetupStep.tsx:94-110` (local flag only) |
| Settings → Payment Setup | **Connect GoCardless / Stripe** | `src/components/settings/SettingsScreen.tsx:536` (hits the stub) |

**What's needed (Phase 2):** the connect endpoint should return a real provider authorization URL; the frontend redirects the user there and handles the callback. A disconnect endpoint to de-authorize.
```
POST /settings/payment/:provider/connect     -> { connectUrl }   # real OAuth URL
POST /settings/payment/:provider/disconnect  -> { connected: false }
```

---

## 4. Reports export

**Problem:** The **Export** button toasts "Export is not available yet."

| Screen | Button | File |
|---|---|---|
| Reports | **Export** | `src/components/reports/ReportsScreen.tsx:252` |

**Suggested endpoint:**
```
GET /reports/export?period=...&status=...   -> text/csv (or a { url } link)
```

---

## NOT your job — frontend-only dead controls

These are broken on the **frontend side** (missing wiring or decorative controls). Listed so you don't spend time on them — the frontend team will fix or remove them.

- **Debt board "Select all" + row checkboxes** — selection is never used by any action. `src/components/debt-payment/DebtPaymentScreen.tsx:316`
- **Login "Remember me"** — does nothing. `src/pages/Login.tsx:123`
- **Pause Service → "Notify via SMS" toggle** — value discarded (will reuse feature #1 when built). `src/components/property-detail/PauseServiceModal.tsx:208`
- **Technician Photos → "View customer profile" / "Contact"** — buttons have no action. `src/components/technicians/TechnicianPhotos.tsx:269` / `:272`
- **Technician Photos/Conversation filters** — no-op dropdowns. `src/components/technicians/TechnicianPhotos.tsx:134`

---

## Honest "coming soon" screens (no action needed yet)

These already show a clear "coming soon" state and don't pretend to work — they'll light up when their backend lands:

- Technician **Conversation** + **Photos** screens (need feature #1 + a photos API)
- Property Detail → **Photos** tab (needs a photos API)
- Round Planner **Map** / Dashboard **GPS** (need a Google Maps key, not a backend endpoint)
- **Technician App** page (mobile app not released)
