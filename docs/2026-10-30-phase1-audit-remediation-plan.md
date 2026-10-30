# RoundFlow Web: Phase 1 Audit Remediation Plan

**Date:** 2026-10-30
**Repo:** roundflow-frontend (React 19, Vite 8, TanStack Query 5, Zustand, RHF + Zod)
**Source:** Agentum AI Phase 1 Completion Audit (36 gaps), checked against all three repos.
**API contracts:** `roundflow-backend/docs/handoff/frontend/2026-10-30-phase1-audit-frontend-handoff.md` (the "handoff"). Section numbers below (H1.x, H2.x) refer to it.
**Backend plan:** `roundflow-backend/docs/handoff/backend/2026-10-30-phase1-audit-remediation-plan.md` (items A1…D).

---

## 0. Summary

About 30 of the 36 gaps need web work. They fall into three groups:

1. **Wire it now.** The endpoint already exists and the web is wrong or missing. No backend dependency. *Do these first; several are one-liners.*
2. **Follow the backend.** The contract is in the handoff, and the work starts when the backend item is on api-dev. Build against MSW mocks of the handoff contract in the meantime.
3. **Must ship before the backend.** Breaking changes the web has to absorb first (`VisitStatus.CANCELLED`, the step-2 booleans removed, authorize returning JSON).

There are **no tests in this repo today** (0 test files, no runner). Phase 0 sets that up.

---

## 1. Test coverage rule (applies to every work item)

**Target: 100% line, branch, function and statement coverage on every file this plan creates or changes.**

### Phase 0: test infrastructure · 6h
- Add dev dependencies: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`.
- `vitest.config.ts`: reuse the Vite config (`@` alias), `environment: "jsdom"`, `setupFiles: ["src/test/setup.ts"]`, include `src/**/*.test.{ts,tsx}`.
- `src/test/setup.ts`: jest-dom matchers; an MSW server (`src/test/msw/server.ts`) with handlers in `src/test/msw/handlers/*.ts`, one file per API module, **typed from `src/api/types.gen.ts`** so mocks can't drift from the spec; reset between tests; a `renderWithProviders()` helper (QueryClient with `retry: false`, MemoryRouter, Zustand reset).
- Mock `@/lib/supabase` (`getCachedAccessToken`) in setup.
- **Coverage gate:** `coverage.include` is an explicit list, `AUDIT_REMEDIATION_FILES`, in `vitest.config.ts`. It mirrors the backend convention. Every file created or touched by this plan is added to it, with `thresholds: { 100: true, perFile: true }`.
- When a touched file is a large legacy screen (e.g. `RoundPlannerScreen.tsx`, `PropertyDetailScreen.tsx`) and full-file 100% would mean testing unrelated legacy code, **extract the changed logic** into a hook or pure function (`features/<x>/lib/*.ts`, `hooks/*.ts`), gate that at 100%, and cover the screen's changed lines with the diff-coverage gate below.
- **Diff-coverage gate:** `scripts/diff-coverage.mjs` reads `coverage/lcov.info` and `git diff origin/main...HEAD` and fails if any added or changed line in `src/` is uncovered. Scripts: `test`, `test:coverage`, `test:diff-coverage`. Wire them into CI (Vercel build check or a GitHub Action).
- `npm run generate:types` runs in CI against api-dev, and the build fails if `types.gen.ts` changes. That catches backend contract drift.

### What each item must test
- **API module** (`src/api/*.api.ts`): the request path, method and body (asserted in the MSW handler), response mapping, and that each error `code` becomes an `ApiError` with the server message.
- **Mappers** (`features/*/lib/mappers.ts`): every branch, every enum value incl. new ones (`CANCELLED`, `NONE`, `COLLECT_DAILY_BATCH`).
- **Components and screens:** the user flow with `user-event` (happy path, server error shows the server message, loading and empty states, disabled states with their explanation).
- **Query invalidation:** after mutations, assert the right query keys are invalidated (spy on `queryClient.invalidateQueries`).

**Definition of done:** code, tests, 100% on the gated files and changed lines, `tsc -b`, `oxlint` and `vitest run --coverage` green, plus a manual check on api-dev against the audit's reproduction steps.

---

## 2. Work items

### Phase 1: Wire it now (no backend dependency)

| ID | Change | Files | h |
|---|---|---|---|
| **GAP-004** | Send `serviceAreaIds: string[]` (H1.1). Remove the client-only `extraAreaIds`, so multi-area works. | `api/technicians.api.ts:56,67`, `components/setup-wizard/steps/TechniciansStep.tsx:124,204`, `components/technicians/TechnicianForm.tsx:114` | 1 |
| **GAP-024** | Unwrap `/reports/activity` with `toPaginated` (H1.2). Add an `errorElement` / `ErrorBoundary` on every route in `router.tsx`, so one bad response can't blank the app. Verify the revenue `period` mapping; if a 500 reproduces on api-dev, report it to the backend. | `api/reports.api.ts:141`, `features/reports/lib/mappers.ts:192`, `router.tsx`, new `components/RouteError.tsx` | 3 |
| **GAP-011** | Disable or flag `PENDING_INVITE` technicians in the assign wizard, with "Resend invite". Show the server `error` and stay on Review. Stop `CreateRoundModal` from creating the round before assignment succeeds (H1.5). | `AssignTechniciansScreen.tsx:289-292,420-423`, `AssignRoundTechnicianModal.tsx:76`, `CreateRoundModal.tsx:541`, `content/round-planner.ts:382` | 3 |
| **GAP-027 (part 1)** | "Mark as paid" for BACS and cheque rows on the Payments tab through `PATCH /payments/:id/status` (H1.3). Replaced by H2.8 later. | `features/payments` (new) `api/payments.api.ts`, Payments tab in `PropertyDetailScreen` | 3 |
| **GAP-017 (part 1)** | Settings › Integrations › **Messaging (GoHighLevel)** card: Private Integration Token and Location ID form, connect, disconnect, copyable webhook URL, and the server error on a bad token (H1.4). | new `features/settings/components/GhlConnectionCard.tsx`, `api/settings.api.ts`, `pages/Settings.tsx`, `content/settings.ts:107` | 6 |
| **GAP-009** | CSV import: set `cleaningFrequency` from the selected round. Treat a missing or invalid mobile as a row error (shown in the preview, not imported), matching the single-add form. Show an indeterminate progress bar until the first chunk returns, then "N of M". | `lib/property-csv.ts:213-224`, `ImportPropertiesPanel.tsx:16,339-348,439`, `content/setup-wizard.ts:2082` | 3 |
| **GAP-023** | Map view: add the same date and week controls as the list. In week mode, fetch the 7 dates in parallel (or `GET /rounds/planner/stops?from&to` if the backend adds it), colour pins by status, and filter by round and technician. | `RoundPlannerScreen.tsx:167-175,343-358`, `features/maps/*` | 3 |
| **GAP-035 (part 1)** | Remove the hardcoded "Updated 18:10" (`content/todays-work.ts:97`, `hooks/use-todays-work-interactions.ts:23`). Use the query's `dataUpdatedAt` until H2.20 `generatedAt` ships. Hide ETA (stub). | as listed | 1 |
| **GAP-022 (part 1)** | Notes & Risk tab: show `property.accessNotes` / `riskNotes` as pinned cards above PropertyNotes (the data is already loaded). | `PropertyDetailScreen.tsx:308-311,441-453` | 1 |
| **GAP-029 (part 1)** | Empty "Technician involved" dropdown: show "No active technicians. Invites are still pending." Until H2.18 ships, show `resolvedBy` as "Admin" when it's a raw id. | `LogComplaintModal.tsx:77`, `AssignTechnicianModal.tsx:50`, `ComplaintsScreen.tsx:338,831` | 1 |
| **GAP-013 (interim)** | Reassign modal: when `fromTechnicianId` is null, explain why and link to Assign technicians, instead of a silently disabled button. | `ReassignTechnicianModal.tsx:152` | 0.5 |
| **GAP-005 (web part)** | Global: a network failure shows the toast with **Retry**. Splash and spinners time out after 15 s with "Can't reach RoundFlow — Retry". Set the query client `retry` to 2 with backoff for GETs. | `api/client.ts`, `providers/*`, splash component | 3 |
| **Error-display rule** | Audit every `onError` that replaces the server message with a generic string. `ApiError.message` must reach the toast. Grep `couldn't be saved\|Something went wrong`. | app-wide | 2 |

### Phase 2: Must ship before the backend (breaking changes)

| ID | Change | Backend item | h |
|---|---|---|---|
| **VisitStatus.CANCELLED** | Add to the status type, the badge map, filters, the planner, Today's Work, Visit History ("Cancelled (paused)" chip), and reports. Make every `switch` exhaustive with a `never` check, so the compiler finds them all. | A4 | 2 |
| **Step-2 booleans** | Stop sending `gocardlessConnected` / `stripeConnected` (`features/setup/lib/mappers.ts`). | A6 | 0.5 |
| **Authorize returns JSON** | **Stripe done 2026-10-30:** the URL is built client-side and the callback goes through `/settings/stripe/callback` with the bearer header (`lib/stripe-connect.ts`, `pages/StripeCallback.tsx`, 100% covered). Still to do, for GHL: fetch `GET /settings/stripe/authorize` (and GHL) with the bearer header, read `{ url }`, then `window.location.assign(url)`. Handle `?stripe=` and `?ghl=` result params on `/settings/integrations` with a toast. Keep a fallback for the old 302 during the transition. | A5, A6 | 2 |
| **paymentStatus NONE** | `mapPaymentStatus`: `NONE` shows "No invoices" or blank, never "paid"; add `UNPAID`. | GAP-021 | 0.5 |

### Phase 3: Follow the backend (build against MSW mocks of the handoff now)

| ID | Change | Handoff | Backend | h |
|---|---|---|---|---|
| **GAP-012** | Assign wizard "Split jobs": choose SINGLE, AUTO (preview via `dryRun`) or MANUAL (property table with a technician select per row; balance summary). Save sends `split`. Replace the "split is a guide" copy. Show per-technician stops and value on Review. | H2.1 | A1 | 8 |
| **GAP-013** | Reassign supports `fromTechnicianId: null`, scope, "make permanent" and notify. | H2.2 | A1 | 2 |
| **GAP-016** | Activation preview uses `GET /setup/step/11/preview` `total` and per-round counts. | H2.3 | A2 | 1 |
| **GAP-026** | After a hold toggle, invalidate today, planner and customer. Show an "On hold" chip on the visit, planner stop and Today's Work. The On Hold tab works off the new counts. | H2.4 | A3 | 2 |
| **GAP-020** | After pause or resume, invalidate the queries so the header changes without a reload. Show cancelled visits in History; the pause modal explains "N scheduled visits will be cancelled". | H2.5 | A4 | 2 |
| **GAP-017 (part 2)** | GHL card: status from `/settings/ghl/status`, a **Test connection** button (`/settings/ghl/test`), and the OAuth option. Add an optional "Connect messaging" step to the setup wizard (Messages step). The SMS Templates banner links to the card when not connected. Bulk Message and Send Message modals show "Connect messaging" on `GHL_NOT_CONNECTED`. | H2.6 | A5 | 6 |
| **GAP-034** | Payment link, Remind and Send invoice get a channel picker (Auto/SMS/Email/WhatsApp). Handle `STRIPE_NOT_CONNECTED`, `GHL_NOT_CONNECTED`, `NO_CONTACT_FOR_CHANNEL` and `GHL_SEND_FAILED` with specific CTAs. Remove any static `pay.roundflow.app` usage. | H2.6 | A5 | 4 |
| **GAP-036** | Wire the wizard's "Connect Stripe" / "Connect GoCardless" (`SetupWizard.tsx:398-406`) and Settings › Payment Setup to the real flows. GoCardless: access token + environment form, then show the webhook URL; webhook-secret field. Status chips come from the settings GET. | H2.7 | A6 | 4 |
| **GAP-027 (part 2)** | "Mark as paid" modal (method, reference, date) through `POST /invoices/:id/mark-paid`, on the Payments tab, invoice modal, invoice list and debt board. | H2.8 | A7 | 3 |
| **GAP-001** | Business step and Settings › Business Profile send address, town, postcode and `vatRate`. Remove the CONTRACT-DIFF frontend-only handling. | H2.9 | B1 | 2 |
| **GAP-003** | Round Settings step and Settings send `reminderMode`, `reminderTime`, `defaultCleanMethod`, `autoCreateNextVisit` (remove the CONTRACT-DIFF at `mappers.ts:175-193`). | H2.10 | B2 | 3 |
| **GAP-008** | Payment step sends `defaultPaymentMethod`, `invoiceDueDays`, `noDirectDebitAction`; "once a day" maps to `COLLECT_DAILY_BATCH` (`mappers.ts:112-145`). | H2.11 | GAP-008 | 2 |
| **GAP-018** | Change Frequency modal: on 409 `NO_MATCHING_ROUND`, offer "Create <name>" or pick a suggestion, then retry. Show "Moved to <round>". Invalidate and update the header immediately. | H2.12 | B3 | 3 |
| **GAP-019** | Property detail Photos tab and Technicians › Photos: gallery grid (before/after pairs per visit), lightbox, pagination, refetch on focus (signed URLs expire after 1 h). Remove the "Coming Soon" overlays. | H2.13 | B4 | 5 |
| **GAP-014** | Today's Work: "Create invoices for today" opens a preview modal (items, skipped with reasons, untick to exclude, live totals), then confirm, with an optional "Send now" and channel, then a result summary "12 invoices, £246.00 · 1 failed (reason)". | H2.14 | B5 | 8 |
| **GAP-025** | Dashboard Technician KPIs show the computed values. "Record incident" modal (strike, damage, upsell) on technician detail and complaint resolve. Settings › KPI thresholds editor. Alerts list shows threshold alerts. Remove the "Coming in a later phase" copy. | H2.15 | B6 | 8 |
| **GAP-010** | Add Property step: a "Existing customer?" search (`/customers/search`) that pre-fills the customer and sends `customerId`. Show "Matched existing customer" when the server reports `customerMatched`. | H2.16 | GAP-010 | 4 |
| **GAP-021** | Customers list and detail show `paymentStatus`, `amountDue` and `nextDue` from the server. | H2.16 | GAP-021 | 1 |
| **GAP-022 (part 2)** | Bad-debt flag badge and toggle on customer detail (`PATCH /customers/:id/bad-debt`). Pinned notes come from the server. | H2.16 | D | 1 |
| **GAP-028** | New **Invoices** page in the nav: filters (status, date, customer, search), table, row actions (preview, send, mark paid), CSV export of invoices and payments (fetch + blob download). Route, nav entry, content file. | H2.17 | GAP-028 | 6 |
| **GAP-029 (part 2)** | Revisit shows the created visit with a link to the planner. `resolvedBy.name`. The technician dropdown includes pending-invite technicians. | H2.18 | GAP-029 | 1 |
| **GAP-030** | Technician detail: Performance card (period select), Availability list and add/remove, **Replace technician** modal (pick a replacement and date range, then "N visits reassigned"). Remove the "not available from the technicians API yet" copy. | H2.19 | GAP-030 | 6 |
| **GAP-002** | Stepper driven by `wizardSteps` from `/setup/status`, keyed by step key, not index (`features/setup/lib/wizard.ts:58-66`). | H2.20 | GAP-002 | 1 |
| **GAP-031** | Debt KPI captions use `totalOutstandingsCount` and `badDebtCount`. Guard against undefined. | H2.20 | GAP-031 | 0.5 |
| **GAP-032** | Only offer "Generate" invoice on COMPLETED visits. Handle `VISIT_NOT_COMPLETED`. | H2.20 | GAP-032 | 0.5 |
| **GAP-035 (part 2)** | The round row shows `scheduledValue`, with completed value as progress. "Updated HH:mm" from `generatedAt`. | H2.20 | GAP-035 | 1 |
| **GAP-006** | PayPal: **out of scope** (not needed). | — | — | — |
| **GAP-007** | **Deferred** pending a decision (recommend Phase 2). | — | — | — |

---

## 3. Sequencing

```
Week 1  Phase 0 (tests) → Phase 1 quick wins (004, 024, 011, 022, 035, 013, 029, error rule)
        Phase 2 breaking-change prep (CANCELLED, step-2 booleans, authorize JSON, NONE)
Week 2  017 part 1, 027 part 1, 009, 023, 005; start Phase 3 against MSW mocks (012, 014, 019)
Week 3  Phase 3 as backend items land on api-dev: A1→012/013, A2→016, A3→026, A4→020, A5→017/034, A6→036, A7→027
Week 4  B/C items: 001, 003, 008, 018, 025, 010, 021, 028, 030, 002, 031, 032
```

Swap each MSW mock for the real API only after `npm run generate:types` shows the backend contract on api-dev. Make the mock handlers fail loudly if the generated types disagree.

## 4. Risks

- **Large legacy screens** (`RoundPlannerScreen`, `PropertyDetailScreen`, `SetupWizard`) can't reasonably reach whole-file 100%. Extract new logic and diff-cover the screens (§1). Don't refactor them wholesale under this plan.
- **Contract drift** between the handoff and what ships. Type the MSW handlers from `types.gen.ts`, and CI regenerates the types.
- **Breaking changes** (Phase 2) must reach production before the matching backend deploys. Coordinate releases.
