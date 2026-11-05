import type { CustomerDetail } from '@/api/types'
import type { TechnicianListItem } from '@/api/technicians.api'

/** A GET /customers/:id body with one BACS plan and a pending BACS payment. */
export function customerDetailFixture(overrides: Partial<CustomerDetail> = {}): CustomerDetail {
  return {
    customer: { id: 'c1', name: 'Jo Coates', phone: '07700900201', email: 'jo@example.com', status: 'ACTIVE' },
    property: {
      id: 'p1',
      addressLine: '4 Hotspur Street',
      postcode: 'NE66 1TD',
      roundId: 'r1',
      roundName: 'Alnwick Fri',
      accessNotes: 'Gate code 1234',
      riskNotes: 'Dog in garden',
    },
    servicePlans: [
      {
        id: 'sp1',
        serviceName: 'Windows',
        status: 'ACTIVE',
        price: 20,
        paymentMethod: 'BACS',
        cleaningFrequency: 'FOUR_WEEKLY',
        isPrimary: true,
      },
    ],
    standingInfo: { paymentStatus: 'none', frequency: 'FOUR_WEEKLY', outstandingBalance: 0 },
    tabs: {
      visitHistory: [
        { visitId: 'v1', date: '2026-10-01T00:00:00Z', roundName: 'Alnwick Fri', status: 'COMPLETED', paymentStatus: 'PAID' },
        { visitId: 'v2', date: '2026-10-29T00:00:00Z', roundName: 'Alnwick Fri', status: 'CANCELLED', cancelReason: 'PAUSED' } as never,
      ],
      payments: {
        rows: [
          {
            visitId: 'v1',
            visitDate: '2026-10-01T00:00:00Z',
            technicianName: 'Sam',
            amount: 20,
            paymentStatus: 'PENDING',
            paymentId: 'pay1',
            method: 'BACS',
            invoiceStatus: 'SENT',
            invoiceId: 'inv1',
            invoiceNumber: 'INV-001',
            canGenerate: false,
            canDownload: true,
          } as never,
        ],
      },
      notes: [],
    },
    ...overrides,
  } as CustomerDetail
}

export function technicianListItem(overrides: Partial<TechnicianListItem> = {}): TechnicianListItem {
  return {
    id: 't1',
    name: 'Sam',
    phone: '07700900201',
    role: 'STANDARD',
    email: 'sam@example.com',
    notes: null,
    active: true,
    appStatus: 'ACTIVE',
    serviceAreas: [],
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}
