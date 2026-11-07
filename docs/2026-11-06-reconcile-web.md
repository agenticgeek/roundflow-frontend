# Reconcile the web app with backend Waves 1, 2A and 2B-1 (2026-11-06)

Backend contracts: `roundflow-backend/docs/handoff/frontend/2026-11-06-wave1-frontend-contract.md`, `...-wave2a-...`, `...-wave2b1-...`.
Nothing here is committed. Earlier web notes: `2026-11-06-wave1-web.md`, `2026-11-06-wave2a-web.md` (their `TODO(types.gen)` lists are now closed, see below).

## Regenerating `src/api/types.gen.ts` (the backend will change again)

This pass used a frozen snapshot, not the live backend:

```
npx openapi-typescript "<path to openapi.json>" -o src/api/types.gen.ts
npx tsc -b
```

To get a fresh spec from a running backend (production closes `/openapi.json` unless `EXPOSE_API_DOCS=true`, so use dev or local):
`npm run generate:types` (downloads `openapi.json` from `VITE_API_URL`, then runs the same generator), or, from `roundflow-backend`,
`npx tsx -e 'import("./src/swagger.ts").then(m=>require("fs").writeFileSync("../roundflow-frontend/openapi.json",JSON.stringify(m.openApiDocument)))'`
then run the generator above and delete `openapi.json`.
MSW handlers built with `on()` / `specJson()` fail `tsc` where a body drifts, so run `npx tsc -b` after every regeneration.

## 1. Generated types replace every `TODO(types.gen)`

Replaced with `components['schemas'][...]` (no `TODO(types.gen)` is left in `src/`):
notifications (`AdminNotification`, `AdminNotificationPage`, `NotificationData`), `SetTechniciansResult`, bulk send (`InvoiceBulkSend*`),
carryover (`Carryover*`), `CloseDayInput` / `CloseDaySummary` (`carriedToDate`, `target`), stop fields on `PlannerStop` (carryover, geocode precision),
`invoiceFooter` / `paymentTerms` on `BusinessSettings` and the payment patch, the property DTO `latitude` / `locationApproximate`, `GET /invoices?status=OVERDUE`.
Default MSW handlers for notifications and `PUT /rounds/{id}/technicians` are now typed from the spec.

Behaviour changes that follow from the stricter types:
- `toAssignmentOutcome` still defaults `visitsGenerated`, `overriddenVisits`, `nextVisitDate` although the spec now requires them, so the web survives being deployed before the backend.
- `InvoiceExportFilters.status` is widened by hand to accept `OVERDUE` (see "Still hand-typed").

## 2. Phase 1 contract in the UI

- **ADMIN_ONLY.** `useIsAdmin()` (`hooks/use-is-admin.ts`). For a MANAGER, Settings: Payment Setup and Integrations are read-only (the connect, disconnect and edit
  controls are inert), Business Profile keeps the editable fields but VAT number, VAT rate and bank details are read-only and never sent
  (`profilePatchForRole`), and "Delete" for a technician is disabled with `aria-describedby`. Each case has a visible `AdminOnlyNote`. A stale UI that still gets
  `403 ADMIN_ONLY` shows the toast "Only an administrator can do this." The web has no control that invites an ADMIN, so there was nothing to hide for that rule.
  `MutationGate` now sets `inert` on its content (was pointer-events only, so the keyboard could still reach it).
- **RATE_LIMITED, PAYLOAD_TOO_LARGE.** `errorMessage()` (used by inline errors and toasts) returns "Too many attempts. Try again in N seconds." (from `Retry-After`) and
  "That request is too large. Try sending less at once." The public invite lookup uses the same text.
- **Reference.** `ApiError` carries `requestId` (`X-Request-Id`, else the body) and `retryAfterSeconds`. A server error (5xx) message ends with "Reference: <id>" in toasts and inline
  errors; `RouteError` shows it on its own line. The new `Error.fields` list `[{ path, code, message }]` is normalised to the existing `{ path: message }` shape.
  Error building is in `lib/api-error.ts`.
- **Payment statuses.** Payments list: `PROCESSING` ("Collecting"), `REFUNDED`, `DISPUTED`, `OVERDUE` are filter options and chips with text (never colour only); an unknown future status shows
  a readable label. Invoices list: a sent invoice with `overdue` gets a second "Overdue" chip. Visit history payment chips distinguish processing, refunded, disputed, overdue and failed
  from pending. The Debt board has no payment-status chip (it derives from invoices), so nothing changed there.
- **Failed integration messages** (Settings, ADMIN only; `/settings/failed-messages`; the `INTEGRATION` notification links there). Table of `GET /integrations/outbox?status=dead|failed&page=`
  (caption, column headers, status in words, focusable scroll region, pager), a "Show" filter, per-row Retry that opens an `alertdialog` confirm and calls
  `POST /integrations/outbox/{id}/replay`, errors (`OUTBOX_NOT_FOUND`, `OUTBOX_NOT_REPLAYABLE`, `ADMIN_ONLY`, others) in the dialog. Files: `api/integrations.api.ts`,
  `features/integrations/`, `content/integrations.ts`. Hidden from the sidebar for a MANAGER.
- **Idempotency-Key.** `lib/idempotency.ts`: one key per user action, remembered by the input object (a `WeakMap`), so a retry that re-runs the mutation with the same variables
  (the network "Retry" toast, or the 401 refresh-and-resend) reuses the key. Sent on `POST /invoices`, `POST /customers`, `POST /messages/send`, `POST /messages/bulk`,
  `POST /messages/inbox/read` (`api()` takes `idempotencyKey`). `POST /payments/stripe/checkout` is not called by the web (it uses `POST /debt/{id}/payment-link`), so it is untouched.
- `/health/ready` is not used by the web (skipped, as agreed).

## Still hand-typed

- `NotificationType` adds `INTEGRATION` to the generated enum (the spec's enum predates it).
- `InvoiceExportFilters.status` accepts `OVERDUE`; the spec types `GET /invoices/export.csv` without it although its description says "same filters as GET /invoices". Backend question.
- Older `CONTRACT-DIFF` shapes (invoice preview/record, chat, planner batch, property create) are untouched: they were not on the TODO list and the snapshot was not diffed against them.
- `GET /invoices/preview` `business` object and `paymentReference` (Wave 2A item 1) are still not consumed by the UI.

## Tests

New: `lib/{idempotency,api-error,api-error-copy}.test.ts`, `api/idempotency.api.test.ts`, `components/settings/SettingsAdminOnly.test.tsx`,
`features/integrations/components/FailedMessagesPanel.test.tsx`, `components/invoices/payment-statuses.test.tsx`, `features/customer-records/lib/visits.test.ts`,
`pages/AcceptInvite.test.tsx`; extended `client`, `query-client`, `RouteError`, notification tests. New files are in `AUDIT_REMEDIATION_FILES` (100% per file).

## Update 2026-11-06 (wave 2B-2)

Types were regenerated again from `openapi-2026-11-06-b.json`; see `2026-11-06-wave2b2-web.md` for the new screens, copy files and the remaining hand-typed shapes. Closed here: the invoice preview and record (including `business` and `paymentReference`), the `OVERDUE` export filter and the message send input and result. `INTEGRATION` in `NotificationType` is still hand-typed (the spec enum has not caught up).
