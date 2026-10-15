# RoundFlow — What's Still Needed From the Backend

**Date:** 2026-10-15
**For:** Backend
**From:** Frontend
**What this is:** A follow-up to the 2026-10-13 backend response. That batch (messaging, invoice PDF, reports export, payment connect, preferences) is **now wired on the frontend**. This doc lists what's **still missing, still stubbed, or needs your confirmation** — so we can close the loop.

---

## Status of the 2026-10-13 endpoints — all wired ✅

For the record, every endpoint from your last doc is now called by the UI (branch `new`):

| Feature | Endpoint | Wired to |
|---|---|---|
| Messaging — single | `POST /messages/send` | Property-detail Send, Pause-Service notify |
| Messaging — bulk | `POST /messages/bulk` | Message Customers, Weather-Hold notify, Bulk Message |
| Invoice PDF | `GET /invoices/:id/pdf`, `GET /invoices/preview/pdf?visitId=` | Saved + Preview invoice modals (download & print) |
| Reports export | `GET /reports/export` | Reports → Export (visits) |
| GoCardless | `POST /settings/payment/gocardless/connect` | Settings → inline token form |
| Stripe | `GET /settings/stripe/authorize` | Settings → Connect (redirect) |
| Preferences | `GET/PATCH /auth/me/preferences` | API + hook ready |

So **nothing from that list is missing** — only the caveats in §B below. The rest of this doc is new/outstanding work.

---

## A. Still missing — please build

### A1. Invoice **Send** — real delivery
`POST /invoices/:id/send` currently flips status to `SENT` but **sends no email** (your own note). The "Send" button is wired and will work the moment delivery is real. No frontend change needed when it ships.

### A2. Maps — coordinates + service-area data *(biggest one — full detail in `MAPS_INTEGRATION.md`)*
The maps work but geocode **every address in the browser, every session** (no coordinates in the schema) — slow, quota-bound, per-device cache, silent drops. To make maps production-grade we need:

```
# 1. Persist coordinates (preferred: geocode on property write, store on the property)
Property + planner Stop gain:  latitude: number|null, longitude: number|null, geocodedAt: string|null

# 2. Service area on the stop (so pins can show/colour by area)
planner Stop gains:  serviceAreaId: string, serviceAreaName: string, serviceAreaColor?: string

# 3. (Optional) one call for a whole day instead of one-request-per-round (current N+1)
GET /planner/day/:date  → { rounds: [{ roundId, roundName, technician, stops: Stop[] }] }
```
`technicianId/technicianName` and `roundName` are already on the stop — those are fine.

### A3. Debt — **bulk action** endpoint
The Debt board has "Select all" + row checkboxes, but every debt action is single-id (`/debt/:id/remind`, `/payment-link`, `/bad-debt`, `/hold`). The selection can't *do* anything without a bulk variant:

```
POST /debt/bulk/:action        # action ∈ remind | payment-link | bad-debt | hold
  body: { invoiceIds: string[], ...actionParams }
  → { succeeded: string[], failed: [{ id, error }] }
```
(You flagged this in your last doc — "say the word." This is us saying the word, if you want the select-all to be functional.)

### A4. Bulk **property create** (CSV import)
The CSV/Excel import loops **one `POST` per row** because there's no bulk endpoint. Fine for small imports, slow/chatty for big ones:

```
POST /properties/bulk
  body: { properties: PropertyCreateInput[] }
  → { created: number, failed: [{ index, error }] }
```
Nice-to-have, not a blocker.

### A5. OpenAPI/Swagger entries for the new routes
You noted these weren't added. Without them we hand-write types for `/messages/*`, `/invoices/*/pdf`, `/reports/export`, `/auth/me/preferences`, etc. (marked `CONTRACT-DIFF` in our code). Adding them lets us regenerate types and stay in sync.

---

## B. Needs your confirmation — may not be new code

### B1. Stripe authorize — how does auth reach it?
We connect Stripe by redirecting the browser to `GET /settings/stripe/authorize`. But a **top-level navigation can't send our bearer token in a header** (we use Supabase bearer auth, not cookies). Right now we append it as `?access_token=<token>`.
**Please confirm one of:**
- (a) the authorize endpoint accepts `?access_token=` and authenticates from it, **or**
- (b) give us an authenticated endpoint that returns the Stripe URL (e.g. `POST /settings/stripe/authorize → { url }`) and we'll redirect to that instead.

Without this, Connect will 401.

### B2. Stripe callback — target route
Your callback returns to `${FRONTEND_URL}/settings/integrations?stripe=connected`. **That route doesn't exist in our app.** Either:
- change the redirect to `${FRONTEND_URL}/settings?section=payment-setup&stripe=connected`, **or**
- tell us the exact path you'll use and we'll add that route.
(We currently read `?stripe=connected` on the settings screen, so the query flag is handled — it's only the path that needs agreeing.)

### B3. Provider go-live (config/ops)
Stripe needs a **platform account + `STRIPE_CLIENT_ID`/`STRIPE_SECRET_KEY`**; GoCardless needs a real **access token** to test the connect form. Neither can be verified end-to-end until these exist.

### B4. QA / prod rollout + Gotenberg sidecar
Everything is **dev-only** (`api-dev.roundflow.ai`) and the dev tenant is empty, so none of the above has been exercised with live data. Invoice PDFs need the **Gotenberg sidecar in the prod ECS task definition** (your note). Until QA/prod is up we can't integration-test.

---

## C. By design — not missing (for awareness)
- **Message scheduling (`sendAt`)** — intentionally a GHL workflow handoff, no endpoint. Our Bulk Message modal blocks "schedule" and only sends now.
- **Setup-wizard step 2 payment toggles** — remain Phase-1 boolean stubs.

---

## D. Frontend's own remaining work (NOT backend — listed so scope is clear)
These are on us, using endpoints that already exist:
- **SMS Templates CRUD** — wire the settings panel to `GET/POST/PATCH/DELETE /settings/message-templates` (still read-only our side).
- **Reports export** — surface `type=technicians` and `type=revenue` (only `visits` is exposed in the UI today).
- **Part-B preference toggles** — bolt Remember-me / Debt view / Technician filters onto `/auth/me/preferences` (store is built, not yet attached to the toggles).
- **Stripe callback route** — add once B2 is agreed.

---

### TL;DR for the backend engineer
**Build:** A1 invoice email delivery · A2 map coordinates + service-area fields · A3 debt bulk action · (A4 bulk property create, A5 OpenAPI — nice-to-have).
**Confirm:** B1 Stripe authorize auth · B2 Stripe callback path · B3 provider accounts/env · B4 QA/prod + Gotenberg.
