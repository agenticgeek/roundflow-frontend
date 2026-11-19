# One stop per property (web)

Date: 2026-11-19. Branch: `integrate/live`.

Plan and contract: `../docs/PROPERTY_STOPS_PLAN_2026-11-19.md` (workspace root), §3.5 and §7.

## What the office sees

- **Today's Work (round detail):**
  - One card per property, naming its services.
  - Assigning a technician on the card assigns every visit at the property.
  - Counts are properties.
- **Round Planner (list, map, side panel):**
  - One row per property, naming its services. The total is the price.
  - In the side panel, each skipped service has its own "Reschedule <service>" button, so the office can rebook just the gutters.
  - Older servers keep the single "Reschedule" button.
- **Invoices:**
  - A property visit is one invoice with a line per service. Each line shows its own date, which differs only when a service was carried over.
  - Older invoices still show their one line.
- **Visit History (property page):**
  - Each row shows its service and price.
  - Services billed together show the same invoice, so "Generate invoice" is not offered twice.
- **Bulk invoices:** one row per property visit. Unticking it leaves out every service in it.

## Files

- New: `src/features/stops/lib/stops.ts` (`stopServiceSummary`).
- `src/features/today/lib/mappers.ts`: `services` and `visitIds` on `TodaysWorkJob`.
- `src/components/todays-work/TodaysWorkRoundDetailPanel.tsx`: services line, assign for every visit.
- `src/components/round-planner/RoundPlannerListView.tsx` and `RoundPlannerDetailPanel.tsx`: services, per-service reschedule.
- `src/features/customer-records/lib/visits.ts` and `src/features/invoices/lib/mappers.ts`: service, price and the shared invoice.
- `src/features/today/lib/bulk-invoices.ts` (`excludedVisitIds`) and `BulkInvoicesModal.tsx`.
- `src/components/property-detail/InvoicePreviewModal.tsx` and `SavedInvoiceModal.tsx`: a date per line.
- `src/api/types.gen.ts`: regenerated from the backend swagger.

## Tests (written before the code)

| File | Covers |
|---|---|
| `src/features/stops/office-stops.test.ts` | summaries, Today's Work mapping, Visit History and invoices, bulk exclusions |
| `src/components/round-planner/office-stops.test.tsx` | planner per-service reschedule, Today's Work services and assign-all |
| `src/components/property-detail/invoice-lines.test.tsx` | line dates, older servers |

Run with `npx vitest run`. The map tests that fail on a local `VITE_GOOGLE_MAPS_MAP_ID` are a known local issue that predates this work.
