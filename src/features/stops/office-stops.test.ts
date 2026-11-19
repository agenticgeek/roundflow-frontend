import { describe, expect, it } from 'vitest'
import { roundTodayStopsToJobs } from '@/features/today/lib/mappers'
import { customerVisitsToRecords, canGenerateInvoice } from '@/features/customer-records/lib/visits'
import { applyCustomerInvoicesToVisits } from '@/features/invoices/lib/mappers'
import { excludedVisitIds, selectedTotals } from '@/features/today/lib/bulk-invoices'
import { stopServiceSummary } from '@/features/stops/lib/stops'

// Office views of a property with several services on one day (docs/PROPERTY_STOPS_PLAN_2026-11-19.md §3.5, §7.5, §7.7).

const KEY = 'p1|2026-11-19|t1'

describe('stopServiceSummary', () => {
  it('names open and done services, leaving skipped ones out', () => {
    expect(
      stopServiceSummary([
        { visitId: 'v1', serviceName: 'Window clean', status: 'COMPLETED', price: 20 },
        { visitId: 'v2', serviceName: 'Gutter clear', status: 'SCHEDULED', price: 10 },
        { visitId: 'v3', serviceName: 'Fascia', status: 'SKIPPED', price: 5 },
      ]),
    ).toBe('Window clean + Gutter clear')
  })

  it('falls back to "Window clean" for a service with no name, and names a fully skipped stop', () => {
    expect(stopServiceSummary([{ visitId: 'v1', serviceName: null, status: 'SCHEDULED', price: 20 }])).toBe('Window clean')
    expect(stopServiceSummary([{ visitId: 'v1', serviceName: 'Fascia', status: 'SKIPPED', price: 5 }])).toBe('Fascia')
  })

  it('is empty for an older server that sends no services', () => {
    expect(stopServiceSummary(undefined)).toBe('')
  })
})

describe("Today's Work round detail", () => {
  it('one job per stop, naming its services and listing every visit id', () => {
    const [job] = roundTodayStopsToJobs([
      {
        visitId: 'v1',
        stopKey: KEY,
        customerName: 'Jo',
        addressLine: '1 High St',
        latitude: null,
        longitude: null,
        geocodePrecision: null,
        locationApproximate: false,
        carriedOver: false,
        carriedOverFromDate: null,
        status: 'SCHEDULED',
        paymentHold: false,
        hasIssue: false,
        issueFlag: null,
        price: 30,
        services: [
          { visitId: 'v1', serviceName: 'Window clean', status: 'SCHEDULED', price: 20 },
          { visitId: 'v2', serviceName: 'Gutter clear', status: 'SCHEDULED', price: 10 },
        ],
      } as never,
    ])
    expect(job).toMatchObject({ id: 'v1', services: 'Window clean + Gutter clear', visitIds: ['v1', 'v2'] })
  })

  it('an older server without services keeps one visit per job', () => {
    const [job] = roundTodayStopsToJobs([{ visitId: 'v9', customerName: 'Al', addressLine: 'x', status: 'SCHEDULED', paymentHold: false } as never])
    expect(job).toMatchObject({ id: 'v9', services: undefined, visitIds: ['v9'] })
  })
})

describe('Visit History rows', () => {
  const row = (o: Record<string, unknown>) => ({
    visitId: 'v1',
    date: '2026-11-19T00:00:00.000Z',
    roundName: 'Monday',
    status: 'COMPLETED',
    cancelReason: null,
    paymentStatus: 'PAID',
    notes: null,
    serviceName: 'Window clean',
    price: 20,
    stopKey: KEY,
    invoiceId: null,
    billedWithVisitId: null,
    ...o,
  })

  it('shows the service and its price', () => {
    const [record] = customerVisitsToRecords([row({})] as never)
    expect(record).toMatchObject({ service: 'Window clean', price: '£20.00', invoiceId: null, invoice: 'generate' })
  })

  it('a service billed with another one shows the shared invoice and never offers Generate twice', () => {
    const records = customerVisitsToRecords([
      row({ visitId: 'v1', invoiceId: 'inv1' }),
      row({ visitId: 'v2', serviceName: 'Gutter clear', price: 10, invoiceId: 'inv1', billedWithVisitId: 'v1' }),
    ] as never)
    const merged = applyCustomerInvoicesToVisits(records, [
      { id: 'inv1', visitId: 'v1', invoiceNumber: 'INV-2026-001', status: 'DRAFT', amount: 36 } as never,
    ])
    expect(merged.map((r) => [r.id, r.invoiceId, r.invoice])).toEqual([
      ['v1', 'inv1', 'draft'],
      ['v2', 'inv1', 'draft'],
    ])
    expect(merged.some((r) => canGenerateInvoice(r))).toBe(false)
  })

  it('an older server (no service or price) still shows a dash', () => {
    const [record] = customerVisitsToRecords([row({ serviceName: undefined, price: undefined, invoiceId: undefined })] as never)
    expect(record).toMatchObject({ service: '—', price: '—', invoiceId: null })
  })
})

describe('bulk invoices group by billing group', () => {
  const items = [
    { visitId: 'v1', visitIds: ['v1', 'v2'], customerName: 'Jo', total: 36 },
    { visitId: 'v3', visitIds: ['v3'], customerName: 'Al', total: 24 },
    { visitId: 'v4', customerName: 'Old', total: 10 }, // older server: no visitIds
  ] as never[]

  it('unticking a group excludes every visit in it', () => {
    expect(excludedVisitIds(items, new Set(['v1', 'v4']))).toEqual(['v1', 'v2', 'v4'])
  })

  it('totals count groups', () => {
    expect(selectedTotals(items, new Set(['v1']))).toEqual({ count: 2, amount: 34 })
  })
})
