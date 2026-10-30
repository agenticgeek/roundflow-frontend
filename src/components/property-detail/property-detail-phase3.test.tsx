import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { customerRecordsApi } from '@/api/customer-records.api'
import type { InvoiceRecord } from '@/api/invoices.api'
import type { PhotoRow } from '@/api/photos.api'
import { BadDebtBadge, BadDebtControl } from '@/components/property-detail/BadDebtControl'
import { ChangeFrequencyModal } from '@/components/property-detail/ChangeFrequencyModal'
import { InvoiceSendPanel } from '@/components/property-detail/InvoiceSendPanel'
import { PauseServiceModal } from '@/components/property-detail/PauseServiceModal'
import { NotesRiskTab, VisitHistoryTab } from '@/components/property-detail/PropertyDetailTabs'
import { PropertyPhotosTab } from '@/components/property-detail/PropertyPhotosTab'
import { SavedInvoiceModal } from '@/components/property-detail/SavedInvoiceModal'
import { propertyDetailContent } from '@/content/property-detail'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { canGenerateInvoice, customerVisitsToRecords } from '@/features/customer-records/lib/visits'
import { movedToRoundMessage, parseNoMatchingRound } from '@/features/properties/lib/frequency-move'
import { cancelledVisitsLabel, pauseOutcomeToast } from '@/features/properties/lib/pause-outcome'
import { splitPropertyNotes } from '@/features/properties/lib/notes'
import * as download from '@/lib/download'
import { ApiError } from '@/lib/errors'
import { addDays, todayIsoDate } from '@/features/rounds/lib/planner'
import { queryKeys } from '@/lib/query-keys'
import { setBootstrap } from '@/test/bootstrap'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const property = customerDetailToPropertyRecord(customerDetailFixture())!
const onePage = { page: 1, pageSize: 25, total: 1, totalPages: 1 }

describe('customer records API (GAP-020 / GAP-022)', () => {
  it('pages the visit history and flags bad debt', async () => {
    const seen: unknown[] = []
    server.use(
      on('get', '/customers/{id}/visits', ({ request }) => {
        seen.push(new URL(request.url).search)
        return specJson('/customers/{id}/visits', 'get', 200, { rows: [], pagination: onePage })
      }),
      on('patch', '/customers/{id}/bad-debt', async ({ request }) => {
        seen.push(await request.json())
        return HttpResponse.json({ id: 'c1', badDebt: true })
      }),
    )
    await customerRecordsApi.visits('c1', { page: 2, pageSize: 25 })
    await customerRecordsApi.visits('c1')
    await customerRecordsApi.setBadDebt('c1', { flag: true, reason: null })
    expect(seen).toEqual(['?page=2&pageSize=25', '', { flag: true, reason: null }])
  })
})

describe('customer visits mapping (GAP-020 / GAP-032)', () => {
  it('maps rows, falls back for missing fields, and only invoices completed visits', () => {
    const rows = customerVisitsToRecords([
      { visitId: 'v1', date: '2026-10-01T00:00:00Z', roundName: 'Alnwick Fri', status: 'COMPLETED', paymentStatus: 'PAID' },
      { status: 'CANCELLED', cancelReason: 'PAUSED' },
    ])
    expect(rows[0]).toMatchObject({ id: 'v1', round: 'Alnwick Fri', status: 'completed', payment: 'paid', invoice: 'generate' })
    expect(rows[1]).toMatchObject({ id: 'visit-1', round: '—', status: 'cancelled-paused', payment: 'pending' })
    expect(canGenerateInvoice(rows[0]!)).toBe(true)
    expect(canGenerateInvoice(rows[1]!)).toBe(false)
    expect(canGenerateInvoice({ status: 'completed', invoice: 'sent' })).toBe(false)
  })
})

describe('VisitHistoryTab with GET /customers/:id/visits (GAP-020)', () => {
  it('loads every status, pages, and offers an invoice only on a completed visit', async () => {
    server.use(
      on('get', '/customers/{id}/invoices', () => HttpResponse.json([])),
      on('get', '/customers/{id}/visits', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        return specJson('/customers/{id}/visits', 'get', 200, {
          rows:
            page === 1
              ? [
                  { visitId: 'v1', date: '2026-10-01T00:00:00Z', roundName: 'Alnwick Fri', status: 'COMPLETED', paymentStatus: 'PAID' },
                  { visitId: 'v2', date: '2026-10-29T00:00:00Z', roundName: 'Alnwick Fri', status: 'CANCELLED', cancelReason: 'PAUSED' },
                ]
              : [{ visitId: 'v3', date: '2026-09-01T00:00:00Z', roundName: 'Old round', status: 'SKIPPED' }],
          pagination: { page, pageSize: 25, total: 26, totalPages: 2 },
        })
      }),
    )
    const { user } = renderWithProviders(<VisitHistoryTab property={property} customerId="c1" />)
    expect(screen.getByText(propertyDetailContent.visitHistory.loading)).toBeInTheDocument()
    expect(await screen.findByText('cancelled (paused)')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: propertyDetailContent.visitHistory.invoiceActions.generate })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Old round')).toBeInTheDocument()
  })

  it('explains a failed load and retries', async () => {
    let fail = true
    server.use(
      on('get', '/customers/{id}/invoices', () => HttpResponse.json([])),
      on('get', '/customers/{id}/visits', () =>
        fail
          ? apiError(500, 'Visits unavailable')
          : specJson('/customers/{id}/visits', 'get', 200, { rows: [], pagination: { ...onePage, total: 0 } }),
      ),
    )
    const { user } = renderWithProviders(<VisitHistoryTab property={property} customerId="c1" />)
    expect(await screen.findByText('Visits unavailable')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: propertyDetailContent.visitHistory.retry }))
    expect(await screen.findByText(propertyDetailContent.visitHistory.emptyLabel)).toBeInTheDocument()
  })
})

describe('NotesRiskTab with server notes (GAP-022 part 2)', () => {
  it('pins the server’s risk / access notes and maps note types', async () => {
    server.use(
      on('get', '/properties/{id}/notes', () =>
        HttpResponse.json([
          { pinned: true, source: 'ACCESS', body: 'Key under the mat' },
          { pinned: true, source: 'RISK', body: 'Fragile conservatory' },
          { id: 'n1', type: 'RISK_WARNING', body: 'Ladder unsafe', authorName: 'Sam', createdAt: '2026-10-20T00:00:00Z' },
          { id: 'n2', type: 'CUSTOMER', body: 'Prefers mornings', authorName: null, createdAt: '2026-10-21T00:00:00Z' },
          { type: 'INTERNAL' },
        ]),
      ),
    )
    renderWithProviders(<NotesRiskTab property={property} notes={[]} customerId="c1" />)
    expect(await screen.findByText('Key under the mat')).toBeInTheDocument()
    expect(screen.getByText('Fragile conservatory')).toBeInTheDocument()
    expect(screen.getByText('Ladder unsafe')).toBeInTheDocument()
    expect(screen.queryByText('Gate code 1234')).not.toBeInTheDocument()
  })

  it('splits pinned entries from notes with fallbacks', () => {
    const { pinned, notes } = splitPropertyNotes([
      { pinned: true, source: 'RISK', body: 'Dog' },
      { id: 'n1', type: 'RISK_WARNING', body: 'Ladder', authorName: 'Sam', createdAt: '2026-10-20T00:00:00Z' },
      { id: 'n2', type: 'CUSTOMER', body: 'Mornings' },
      { type: 'INTERNAL' },
    ])
    expect(pinned).toEqual([{ source: 'RISK', body: 'Dog' }])
    expect(notes.map((note) => note.category)).toEqual(['risk', 'customer', 'internal'])
    expect(notes[2]).toMatchObject({ id: 'note-3', body: '', author: 'Unknown' })
    expect(notes[1]!.author).toBe('Unknown')
  })
})

describe('BadDebtControl (GAP-022)', () => {
  it('flags with a reason, then refreshes the customer and the debt board', async () => {
    let body: unknown
    server.use(
      on('patch', '/customers/{id}/bad-debt', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'c1', badDebt: true })
      }),
    )
    const { user, queryClient } = renderWithProviders(
      <>
        <BadDebtBadge />
        <BadDebtControl customerId="c1" customerName="Jo Coates" badDebt={false} />
      </>,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByText('Bad debt')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Flag bad debt' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Flag as bad debt')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Reason (optional)'), '  Moved away  ')
    await user.click(within(dialog).getByRole('button', { name: 'Flag bad debt' }))
    expect(await screen.findByText('Jo Coates flagged as bad debt')).toBeInTheDocument()
    expect(body).toEqual({ flag: true, reason: 'Moved away' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.customers.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.debt.all })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clears the flag, shows a failure, and cancels', async () => {
    const hold = gate()
    let calls = 0
    const bodies: unknown[] = []
    server.use(
      on('patch', '/customers/{id}/bad-debt', async ({ request }) => {
        bodies.push(await request.json())
        calls += 1
        if (calls === 1) return apiError(409, 'Customer has no debt')
        await hold.wait()
        return HttpResponse.json({ id: 'c1', badDebt: false })
      }),
    )
    const { user } = renderWithProviders(<BadDebtControl customerId="c1" customerName="Jo" badDebt />)
    await user.click(screen.getByRole('button', { name: 'Clear bad debt' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Clear bad-debt flag')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Clear flag' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Customer has no debt')
    await user.click(within(dialog).getByRole('button', { name: 'Clear flag' }))
    expect(await within(dialog).findByRole('button', { name: /Saving…/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while saving
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    hold.release()
    expect(await screen.findByText('Bad-debt flag cleared for Jo')).toBeInTheDocument()
    expect(bodies).toEqual([{ flag: false, reason: null }, { flag: false, reason: null }])

    await user.click(screen.getByRole('button', { name: 'Clear bad debt' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

function invoice(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return {
    id: 'inv1',
    invoiceNumber: 'INV-001',
    status: 'DRAFT',
    amount: 20,
    dueDate: null,
    sentToCustomer: false,
    sentAt: null,
    createdAt: '2026-10-30T09:00:00Z',
    customerId: 'c1',
    visitId: 'v1',
    paymentMethod: 'BACS',
    ...overrides,
  }
}

function sent(channel: 'SMS' | 'EMAIL') {
  return specJson('/invoices/{id}/send', 'post', 200, {
    id: 'inv1',
    invoiceNumber: 'INV-001',
    status: 'SENT',
    sentToCustomer: true,
    sentAt: null,
    messageId: 'm1',
    channel,
  })
}

describe('InvoiceSendPanel (GAP-034 / GAP-027 part 2)', () => {
  it('sends on the chosen channel', async () => {
    let body: unknown
    server.use(
      on('post', '/invoices/{id}/send', async ({ request }) => {
        body = await request.json()
        return sent('EMAIL')
      }),
    )
    const { user } = renderWithProviders(<InvoiceSendPanel invoice={invoice()} customerName="Jo" />)
    await user.click(screen.getByRole('radio', { name: 'Email' }))
    await user.click(screen.getByRole('button', { name: propertyDetailContent.generateInvoiceModal.actions.sendNow }))
    expect(await screen.findByText('Invoice sent by Email')).toBeInTheDocument()
    expect(body).toEqual({ channel: 'EMAIL' })
  })

  it('turns INVOICE_ALREADY_SENT into "Send again", and shows other errors with their CTA', async () => {
    const bodies: unknown[] = []
    server.use(
      on('post', '/invoices/{id}/send', async ({ request }) => {
        bodies.push(await request.json())
        if (bodies.length === 1) return apiError(409, 'Already sent', 'INVOICE_ALREADY_SENT')
        if (bodies.length === 2) return apiError(409, 'Connect GoHighLevel first', 'GHL_NOT_CONNECTED')
        return sent('SMS')
      }),
    )
    const { user } = renderWithProviders(<InvoiceSendPanel invoice={invoice()} customerName="Jo" />)
    await user.click(screen.getByRole('button', { name: propertyDetailContent.generateInvoiceModal.actions.sendNow }))
    expect(await screen.findByText('This invoice was already sent.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send again' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connect GoHighLevel first')
    expect(screen.getByRole('link', { name: 'Connect messaging' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: propertyDetailContent.generateInvoiceModal.actions.sendNow }))
    expect(await screen.findByText('Invoice sent by SMS')).toBeInTheDocument()
    expect(bodies).toEqual([{ channel: 'AUTO' }, { channel: 'AUTO', resend: true }, { channel: 'AUTO' }])
  })

  it('offers "Send again" on a SENT invoice and opens the mark-paid dialog', async () => {
    let body: unknown
    server.use(
      on('post', '/invoices/{id}/send', async ({ request }) => {
        body = await request.json()
        return sent('SMS')
      }),
    )
    const { user } = renderWithProviders(
      <InvoiceSendPanel invoice={invoice({ status: 'SENT', customer: { name: '', email: null, phone: null, addressLine: null, postcode: null } })} customerName="Jo Coates" />,
    )
    await user.click(screen.getByRole('button', { name: 'Send again' }))
    await waitFor(() => expect(body).toEqual({ channel: 'AUTO', resend: true }))
    await user.click(screen.getByRole('button', { name: 'Mark as paid' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Jo Coates · £20.00')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

function photo(overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id: 'ph1',
    type: 'ACCESS_ISSUE',
    url: 'https://signed/ph1.jpg',
    thumbnailUrl: 'https://signed/ph1.jpg',
    takenAt: '2026-10-30T09:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-30T00:00:00Z',
    technician: { id: 't1', name: 'Sam' },
    ...overrides,
  }
}

describe('PropertyPhotosTab (GAP-019)', () => {
  it('filters by type from page 1 and labels access-issue photos', async () => {
    const searches: string[] = []
    let fail = true
    server.use(
      on('get', '/properties/{id}/photos', ({ request }) => {
        searches.push(new URL(request.url).search)
        if (fail) return apiError(500, 'Storage down')
        return specJson('/properties/{id}/photos', 'get', 200, {
          rows: [photo()],
          pagination: { page: 1, pageSize: 24, total: 30, totalPages: 2 },
        })
      }),
    )
    const { user } = renderWithProviders(<PropertyPhotosTab propertyId="p1" />)
    expect(await screen.findByText('Photos could not be loaded.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Open photo: Access issue' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Access issue' }))
    expect(screen.getByRole('radio', { name: 'Access issue' })).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(searches.at(-1)).toContain('type=ACCESS_ISSUE'))
    expect(searches.at(-1)).toContain('page=1')
    expect(searches.some((search) => search.includes('page=2'))).toBe(true)
  })
})

/** A 409 NO_MATCHING_ROUND body as the API sends it. */
function noMatchingRound() {
  return HttpResponse.json(
    {
      error: 'No 6-weekly round in Alnwick',
      code: 'NO_MATCHING_ROUND',
      proposedName: 'Alnwick Fri 6wk',
      suggestions: [
        { id: 'r6', name: 'Alnwick Mon 6wk', frequency: 'SIX_WEEKLY', defaultDay: 'MONDAY' },
        { id: 'r7', name: 'Alnwick Tue', frequency: null },
        { name: 'nameless' },
      ],
    },
    { status: 409 },
  )
}

async function chooseSixWeekly(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(screen.getByRole('button', { name: propertyDetailContent.changeFrequencyModal.placeholder }))
  await user.click(screen.getByRole('option', { name: 'Every 6 weeks' }))
  await user.click(screen.getByRole('button', { name: 'Change Frequency' }))
}

describe('ChangeFrequencyModal (GAP-018)', () => {
  it('on NO_MATCHING_ROUND, creates the proposed round and says so', async () => {
    const bodies: unknown[] = []
    const hold = gate()
    server.use(
      on('patch', '/service-plans/{id}', async ({ request }) => {
        const body = await request.json()
        bodies.push(body)
        if (bodies.length === 1) return noMatchingRound()
        await hold.wait()
        return HttpResponse.json({ servicePlan: { id: 'sp1' }, movedToRound: { id: 'r9', name: 'Alnwick Fri 6wk', created: true } })
      }),
    )
    const onClose = vi.fn()
    const { user, queryClient } = renderWithProviders(<ChangeFrequencyModal open property={property} onClose={onClose} />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await chooseSixWeekly(user)

    const prompt = await screen.findByRole('alert')
    expect(prompt).toHaveTextContent('No 6-weekly round in Alnwick')
    expect(within(prompt).getByText('Every 6 weeks')).toBeInTheDocument()
    expect(within(prompt).queryByRole('button', { name: 'Move to nameless' })).not.toBeInTheDocument()
    await user.click(within(prompt).getByRole('button', { name: 'Create “Alnwick Fri 6wk”' }))
    expect(await screen.findByRole('button', { name: 'Moving…' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' }) // ignored while saving
    expect(onClose).not.toHaveBeenCalled()
    hold.release()

    expect(await screen.findByText('Created Alnwick Fri 6wk and moved the property there')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(bodies).toEqual([{ cleaningFrequency: 'SIX_WEEKLY' }, { cleaningFrequency: 'SIX_WEEKLY', createRoundIfMissing: true }])
    expect(invalidate).toHaveBeenCalled()
  })

  it('moves to a suggested round with PATCH /properties/:id roundId', async () => {
    let propertyBody: unknown
    server.use(
      on('patch', '/service-plans/{id}', () => noMatchingRound()),
      on('patch', '/properties/{id}', async ({ request }) => {
        propertyBody = await request.json()
        return HttpResponse.json({ id: 'p1', movedToRound: null })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<ChangeFrequencyModal open property={property} onClose={onClose} />)
    await chooseSixWeekly(user)
    await user.click(await screen.findByRole('button', { name: 'Move to Alnwick Mon 6wk' }))
    expect(await screen.findByText('Moved to Alnwick Mon 6wk')).toBeInTheDocument()
    expect(propertyBody).toEqual({ roundId: 'r6' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a failed move, and a new choice hides the prompt', async () => {
    server.use(
      on('patch', '/service-plans/{id}', () => noMatchingRound()),
      on('patch', '/properties/{id}', () => apiError(409, 'Round is not ACTIVE')),
    )
    const { user } = renderWithProviders(<ChangeFrequencyModal open property={property} onClose={vi.fn()} />)
    await chooseSixWeekly(user)
    await user.click(await screen.findByRole('button', { name: 'Move to Alnwick Tue' }))
    expect(await screen.findByText('Round is not ACTIVE')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Every 6 weeks' }))
    await user.click(screen.getByRole('option', { name: 'Every 8 weeks' }))
    expect(screen.queryByRole('button', { name: 'Move to Alnwick Tue' })).not.toBeInTheDocument()
  })

  it('without a plan, changes the property and moves it to an existing round', async () => {
    let body: unknown
    server.use(
      on('patch', '/properties/{id}', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'p1', movedToRound: { id: 'r6', name: 'Alnwick Mon 6wk', created: false } })
      }),
    )
    const { user } = renderWithProviders(
      <ChangeFrequencyModal open property={{ ...property, primaryPlanId: null }} onClose={vi.fn()} />,
    )
    await chooseSixWeekly(user)
    expect(await screen.findByText('Moved to Alnwick Mon 6wk')).toBeInTheDocument()
    expect(body).toEqual({ cleaningFrequency: 'SIX_WEEKLY' })
  })

  it('shows any other error as-is', async () => {
    server.use(on('patch', '/service-plans/{id}', () => apiError(400, 'cleaningFrequency is invalid')))
    const { user } = renderWithProviders(<ChangeFrequencyModal open property={property} onClose={vi.fn()} />)
    await chooseSixWeekly(user)
    expect(await screen.findByText('cleaningFrequency is invalid')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('parses the 409 defensively and words the success toast', () => {
    expect(parseNoMatchingRound(new Error('boom'))).toBeNull()
    expect(parseNoMatchingRound(new ApiError(409, 'Busy', 'OTHER'))).toBeNull()
    expect(parseNoMatchingRound(new ApiError(409, 'No round', 'NO_MATCHING_ROUND'))).toEqual({
      message: 'No round',
      proposedName: '',
      suggestions: [],
    })
    expect(movedToRoundMessage(null)).toBe('Service frequency updated')
    expect(movedToRoundMessage(undefined)).toBe('Service frequency updated')
  })

  it('hides the create button when the API proposes no name', async () => {
    server.use(
      on('patch', '/service-plans/{id}', () =>
        HttpResponse.json({ error: 'No round', code: 'NO_MATCHING_ROUND', suggestions: [] }, { status: 409 }),
      ),
    )
    const { user } = renderWithProviders(<ChangeFrequencyModal open property={property} onClose={vi.fn()} />)
    await chooseSixWeekly(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('No round')
    expect(screen.queryByRole('button', { name: /^Create/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Or move to an existing round')).not.toBeInTheDocument()
  })
})

describe('PauseServiceModal outcome (GAP-020)', () => {
  function pauseResult(cancelledVisits: number, pauseScheduled: boolean) {
    return HttpResponse.json({ id: 'sp1', status: pauseScheduled ? 'ACTIVE' : 'PAUSED', cancelledVisits, pauseScheduled })
  }

  it('says the plan is paused now and how many visits were cancelled', async () => {
    server.use(on('post', '/service-plans/{id}/pause', () => pauseResult(3, false)))
    const onClose = vi.fn()
    const { user } = renderWithProviders(<PauseServiceModal open property={property} planId="sp1" onClose={onClose} />)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Pause Service' }))
    expect(await screen.findByText('Service paused')).toBeInTheDocument()
    expect(screen.getByText('3 scheduled visits will be cancelled')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('says a future pause is scheduled (property fallback)', async () => {
    server.use(on('post', '/properties/{id}/pause', () => pauseResult(0, true)))
    const { user } = renderWithProviders(<PauseServiceModal open property={property} onClose={vi.fn()} />)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Pause Service' }))
    expect(await screen.findByText(/^Pause scheduled from /)).toBeInTheDocument()
    expect(screen.getByText('No scheduled visits were in the pause window')).toBeInTheDocument()
  })

  it('words the outcome', () => {
    expect(cancelledVisitsLabel(1)).toBe('1 scheduled visit will be cancelled')
    const start = addDays(todayIsoDate(), 7)
    expect(pauseOutcomeToast({ cancelledVisits: 2, pauseScheduled: true }, start).title).toMatch(/^Pause scheduled from /)
  })
})

describe('read-only roles', () => {
  it('do not see the invoice action on visit history', () => {
    setBootstrap({ canMutate: false })
    renderWithProviders(<VisitHistoryTab property={property} visits={customerVisitsToRecords([{ visitId: 'v1', status: 'COMPLETED' }])} />)
    expect(screen.queryByRole('button', { name: propertyDetailContent.visitHistory.invoiceActions.generate })).not.toBeInTheDocument()
  })
})

describe('SavedInvoiceModal', () => {
  it('downloads the invoice PDF', async () => {
    const save = vi.spyOn(download, 'downloadBlob').mockImplementation(() => undefined)
    server.use(
      on('get', '/invoices/{id}', () => HttpResponse.json(invoice({ status: 'PAID' }))),
      on('get', '/invoices/{id}/pdf', () => new HttpResponse('%PDF', { headers: { 'Content-Type': 'application/pdf' } })),
    )
    const { user } = renderWithProviders(
      <SavedInvoiceModal
        open
        invoiceId="inv1"
        customerName="Jo Coates"
        address="4 Hotspur St"
        paymentMethod="BACS"
        onClose={vi.fn()}
      />,
    )
    await user.click(await screen.findByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.pdf$/)))
  })
})
