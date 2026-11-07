# Reconcile web: COMPLETE (2026-11-06)

All three tasks are done; see `2026-11-06-reconcile-web.md` for what changed and the regeneration command.

Final state: `npx tsc -b` clean; `npx oxlint` 0 errors (9 old warnings); `npx vite build` ok; `npm run test:coverage` exit 0 twice (96 files, 627 tests);
`npm run test:diff-coverage` all 785 changed lines covered. No commits.
Note: `components/invoices/bulk-send.test.tsx` "sends the drafts of the current view" failed once under heavy parallel load (5 s async timeout) and passed on every other run; it is load-flaky, not broken.

Remaining hand-typed shapes: `INTEGRATION` in `NotificationType`; `InvoiceExportFilters.status` accepts OVERDUE (spec omits it on `/invoices/export.csv`); older CONTRACT-DIFF shapes (invoice preview/record, chat, planner batch, property create) untouched; invoice preview `business`/`paymentReference` not consumed.

Not started (waiting for the backend email wave and a new snapshot): email/branding UI, payment-method recording. Regenerate types first when it lands.
