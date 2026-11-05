import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Files created by the Phase 1 audit remediation are held to 100% line/branch/function/
// statement coverage, per file (docs/2026-10-30-phase1-audit-remediation-plan.md §1). Legacy
// files that only gained a few lines (screens, mappers) are not gated whole — their changed
// lines are checked by `npm run test:diff-coverage` instead, which is why coverage is collected
// for all of src/.
const AUDIT_REMEDIATION_FILES = [
  // Stripe Connect (done before this plan)
  'src/lib/stripe-connect.ts',
  'src/pages/StripeCallback.tsx',
  // GAP-024 route error boundary
  'src/components/RouteError.tsx',
  'src/lib/route-error.ts',
  'src/content/app-errors.ts',
  // GAP-011 pending invites + assignment
  'src/features/invites/hooks/useResendTechnicianInvite.ts',
  'src/components/round-planner/PendingInviteResend.tsx',
  'src/features/rounds/lib/assign.ts',
  'src/features/rounds/lib/create-round.ts',
  // GAP-027 mark BACS / cheque paid
  'src/api/payments.api.ts',
  'src/features/payments/hooks/usePayments.ts',
  'src/features/payments/lib/mark-paid.ts',
  'src/components/property-detail/MarkPaymentPaidButton.tsx',
  // GAP-017 GoHighLevel connection
  'src/features/settings/hooks/useGhl.ts',
  'src/features/settings/components/GhlConnectionCard.tsx',
  // GAP-009 CSV import
  'src/lib/round-frequency.ts',
  // GAP-023 map date / week controls
  'src/features/maps/lib/stops.ts',
  'src/components/round-planner/RoundPlannerMapSection.tsx',
  // GAP-035 "Updated HH:mm"
  'src/features/today/lib/updated-at.ts',
  // GAP-022 pinned access / risk notes
  'src/components/property-detail/PinnedPropertyNotes.tsx',
  // GAP-029 complaints
  'src/features/complaints/lib/format.ts',
  // GAP-005 network failures
  'src/lib/network-error.ts',
  'src/lib/query-client.ts',
  'src/hooks/use-timeout-elapsed.ts',
  'src/components/FullScreenLoader.tsx',
  // Phase 2: VisitStatus.CANCELLED, paymentStatus NONE / UNPAID
  'src/lib/visit-status.ts',
  'src/features/customers/lib/payment-status.ts',
  // Phase 3: setup / settings
  'src/features/settings/hooks/useIntegrationReturn.ts',
  'src/features/settings/hooks/useKpiThresholds.ts',
  'src/features/settings/lib/business-rules.ts',
  'src/features/setup/lib/bulk-errors.ts',
  'src/components/settings/KpiThresholdsPanel.tsx',
  // Phase 3: shared billing / messaging / photo building blocks
  'src/content/shared-actions.ts',
  'src/components/messaging/ChannelPicker.tsx',
  'src/features/messaging/lib/messaging-errors.ts',
  'src/api/photos.api.ts',
  'src/features/photos/hooks/usePhotos.ts',
  'src/features/photos/lib/group.ts',
  'src/components/photos/PhotoGallery.tsx',
  // Phase 3: GAP-028 Invoices page, GAP-027 part 2 invoice mark-paid, GAP-014 bulk invoices
  'src/pages/Invoices.tsx',
  'src/content/invoices.ts',
  'src/components/invoices/InvoicesScreen.tsx',
  'src/components/invoices/MarkInvoicePaidModal.tsx',
  'src/components/invoices/SendInvoiceModal.tsx',
  'src/features/invoices/hooks/useInvoiceActions.ts',
  'src/features/invoices/hooks/useInvoiceLists.ts',
  'src/features/invoices/lib/list.ts',
  'src/features/invoices/lib/manual-method.ts',
  'src/components/todays-work/BulkInvoicesModal.tsx',
  'src/features/today/hooks/useBulkInvoices.ts',
  'src/features/today/lib/bulk-invoices.ts',
  // Phase 3: property detail (GAP-018/019/020/022/026/032)
  'src/api/customer-records.api.ts',
  'src/features/customer-records/hooks/useCustomerRecords.ts',
  'src/features/customer-records/lib/visits.ts',
  'src/features/properties/lib/frequency-move.ts',
  'src/features/properties/lib/notes.ts',
  'src/features/properties/lib/pause-outcome.ts',
  'src/components/property-detail/BadDebtControl.tsx',
  'src/components/property-detail/InvoiceSendPanel.tsx',
  'src/components/property-detail/PropertyPhotosTab.tsx',
  // Phase 3: round planner (GAP-012 split, on-hold)
  'src/features/rounds/hooks/useRoundSplit.ts',
  'src/features/rounds/lib/split.ts',
  'src/components/round-planner/RoundSplitCard.tsx',
  'src/components/round-planner/OnHoldChip.tsx',
  // Phase 3: technicians (GAP-025 incidents, GAP-030 availability / replace, GAP-019 photos)
  'src/api/technician-records.api.ts',
  'src/content/technician-records.ts',
  'src/features/technicians/hooks/useTechnicianRecords.ts',
  'src/features/technicians/lib/records.ts',
  'src/components/technicians/RecordIncidentModal.tsx',
  'src/components/technicians/ReplaceTechnicianModal.tsx',
  'src/components/technicians/TechnicianAvailabilityPanel.tsx',
  'src/components/technicians/TechnicianIncidentsPanel.tsx',
  'src/components/technicians/TechnicianPerformanceCard.tsx',
  'src/components/technicians/TechnicianPhotoGallery.tsx',
  // Phase 3: dashboard KPIs / alerts, complaints
  'src/features/dashboard/lib/kpi-alerts.ts',
  'src/features/dashboard/lib/technician-kpis.ts',
  'src/components/dashboard/KpiAlertsPanel.tsx',
  'src/components/complaints/RevisitBookedNotice.tsx',
]

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Long user-event flows (typing whole forms) exceed 5 s when every worker runs at once.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/api/types.gen.ts', 'src/**/*.d.ts', 'src/main.tsx'],
      thresholds: Object.fromEntries(
        AUDIT_REMEDIATION_FILES.map((file) => [file, { 100: true, perFile: true }]),
      ),
    },
  },
})
