import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { directDebitApi, type DirectDebitStatus, type MandateImportCandidate } from '@/api/direct-debit.api'
import { DirectDebitPanel } from '@/components/property-detail/DirectDebitPanel'
import { directDebitLabel, initialChoices } from '@/features/direct-debit/lib/direct-debit'
import { MandateImportModal } from '@/components/payments/MandateImportModal'
import { directDebitContent } from '@/content/direct-debit'
import { propertyDraftToStep9Input } from '@/features/setup/lib/mappers'
import { setupWizardContent } from '@/content/setup-wizard'
import type { PropertyDraft } from '@/types/setup-wizard'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const copy = directDebitContent

function status(over: Partial<DirectDebitStatus> = {}): DirectDebitStatus {
  return { gocardlessConnected: true, mandateStatus: null, mandateId: null, linkSentAt: null, linkUrl: null, linkExpiresAt: null, ...over }
}

function candidate(over: Partial<MandateImportCandidate> = {}): MandateImportCandidate {
  return {
    mandateId: 'MD1',
    status: 'active',
    reference: null,
    createdAt: null,
    gcCustomerId: 'CU1',
    name: 'Oliver Smith',
    email: 'o@x.com',
    phone: null,
    postcode: null,
    linkedCustomerId: null,
    suggestion: { customerId: 'c1', customerName: 'Oliver Smith', matchedBy: 'email' },
    ambiguous: false,
    ...over,
  }
}

describe('directDebitApi', () => {
  it('calls the customer and import endpoints', async () => {
    const seen: unknown[] = []
    server.use(
      on('get', '/customers/{id}/direct-debit', ({ params }) => {
        seen.push(['status', params.id])
        return HttpResponse.json(status())
      }),
      on('post', '/customers/{id}/direct-debit/link', () => {
        seen.push(['link'])
        return HttpResponse.json({ url: 'https://gc/x', expiresAt: null })
      }),
      on('post', '/customers/{id}/direct-debit/send', async ({ request }) => {
        seen.push(['send', await request.json()])
        return HttpResponse.json({ status: 'sent', channel: 'SMS', url: 'https://gc/x', expiresAt: null })
      }),
      on('get', '/integrations/gocardless/mandates/import', () => HttpResponse.json({ rows: [] })),
      on('post', '/integrations/gocardless/mandates/import', async ({ request }) => {
        seen.push(['import', await request.json()])
        return HttpResponse.json({ linked: 1, failed: 0, results: [] })
      }),
    )
    await directDebitApi.status('c 1')
    await directDebitApi.link('c1')
    await directDebitApi.send('c1', 'SMS')
    await expect(directDebitApi.importCandidates()).resolves.toEqual({ rows: [] })
    await directDebitApi.importMandates([{ mandateId: 'MD1', customerId: 'c1' }])
    expect(seen).toEqual([
      ['status', 'c 1'],
      ['link'],
      ['send', { channel: 'SMS' }],
      ['import', { links: [{ mandateId: 'MD1', customerId: 'c1' }] }],
    ])
  })
})

describe('directDebitLabel', () => {
  it('names the mandate status, a sent link, or nothing set up', () => {
    expect(directDebitLabel({ mandateStatus: 'active', linkSentAt: null })).toBe('Active')
    expect(directDebitLabel({ mandateStatus: 'weird_new_status', linkSentAt: null })).toBe('weird_new_status')
    expect(directDebitLabel({ mandateStatus: null, linkSentAt: '2026-11-18T10:00:00Z' })).toBe('Setup link sent 18 Nov 2026')
    expect(directDebitLabel({ mandateStatus: null, linkSentAt: null })).toBe('Not set up')
  })
})

describe('DirectDebitPanel', () => {
  const renderPanel = (canMutate = true) =>
    renderWithProviders(
      <dl>
        <DirectDebitPanel customerId="c1" customerName="Amelia Jones" canMutate={canMutate} />
      </dl>,
    )

  it('sends a setup link on the chosen channel and refreshes the status', async () => {
    let current = status()
    const sent: unknown[] = []
    server.use(
      on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(current)),
      on('post', '/customers/{id}/direct-debit/send', async ({ request }) => {
        sent.push(await request.json())
        current = status({ linkSentAt: '2026-11-19T09:00:00Z' })
        return HttpResponse.json({ status: 'sent', channel: 'EMAIL', url: 'https://gc/x', expiresAt: null })
      }),
    )
    const { user } = renderPanel()
    expect(await screen.findByText('Not set up')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.panel.sendLink }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Email' }))
    await user.click(within(dialog).getByRole('button', { name: copy.sendModal.send }))
    expect(await screen.findByText(copy.sendModal.done.replace('{customer}', 'Amelia Jones').replace('{channel}', 'Email'))).toBeInTheDocument()
    expect(sent).toEqual([{ channel: 'EMAIL' }])
    expect(await screen.findByText('Setup link sent 19 Nov 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.panel.resendLink })).toBeInTheDocument()
  })

  it('shows a send error inline and can be cancelled', async () => {
    server.use(
      on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status())),
      on('post', '/customers/{id}/direct-debit/send', () => apiError(409, 'This customer already has a Direct Debit set up.', 'MANDATE_EXISTS')),
    )
    const { user } = renderPanel()
    await user.click(await screen.findByRole('button', { name: copy.panel.sendLink }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: copy.sendModal.send }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: copy.sendModal.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('copies the link, and shows it when the clipboard is blocked', async () => {
    server.use(
      on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status())),
      on('post', '/customers/{id}/direct-debit/link', () => HttpResponse.json({ url: 'https://gc/copy', expiresAt: null })),
    )
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'))
    const { user } = renderPanel()
    // After render: userEvent.setup() installs its own clipboard.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(await screen.findByRole('button', { name: copy.panel.copyLink }))
    expect(await screen.findByText(copy.panel.copied)).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith('https://gc/copy')
    await user.click(screen.getByRole('button', { name: copy.panel.copyLink }))
    expect(await screen.findByText(copy.panel.copyFailed.replace('{url}', 'https://gc/copy'))).toBeInTheDocument()
  })

  it('reports a failure to make the link', async () => {
    server.use(
      on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status())),
      on('post', '/customers/{id}/direct-debit/link', () => apiError(409, 'GoCardless is not connected.', 'GOCARDLESS_NOT_CONNECTED')),
    )
    const { user } = renderPanel()
    await user.click(await screen.findByRole('button', { name: copy.panel.copyLink }))
    expect(await screen.findByText('GoCardless is not connected.')).toBeInTheDocument()
  })

  it('offers no actions once a mandate is in place, or to a read-only user', async () => {
    server.use(on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status({ mandateStatus: 'active' }))))
    renderPanel()
    expect(await screen.findByText('Active')).toHaveClass('text-success')
    expect(screen.queryByRole('button', { name: copy.panel.sendLink })).not.toBeInTheDocument()
  })

  it('colours pending and ended mandates', async () => {
    server.use(on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status({ mandateStatus: 'submitted' }))))
    const first = renderPanel()
    expect(await screen.findByText('Being set up')).toHaveClass('text-warning')
    first.unmount()
    server.use(on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status({ mandateStatus: 'cancelled' }))))
    renderPanel(false)
    expect(await screen.findByText('Cancelled')).toHaveClass('text-danger')
    expect(screen.queryByRole('button', { name: copy.panel.sendLink })).not.toBeInTheDocument()
  })

  it('points to payment settings when GoCardless is not connected', async () => {
    server.use(on('get', '/customers/{id}/direct-debit', () => HttpResponse.json(status({ gocardlessConnected: false }))))
    renderPanel()
    expect(await screen.findByText(copy.panel.settingsLink)).toHaveAttribute('href', '/settings/integrations')
    expect(screen.queryByRole('button', { name: copy.panel.sendLink })).not.toBeInTheDocument()
  })
})

describe('MandateImportModal', () => {
  it('starts each row on its suggestion, skipping linked and ambiguous rows', () => {
    expect(
      initialChoices([
        candidate(),
        candidate({ mandateId: 'MD2', linkedCustomerId: 'c9' }),
        candidate({ mandateId: 'MD3', suggestion: null, ambiguous: true }),
      ]),
    ).toEqual({ MD1: { customerId: 'c1', customerName: 'Oliver Smith' }, MD2: null, MD3: null })
  })

  it('links the selected rows, lets a customer be picked, and lists the failures', async () => {
    const posted: unknown[] = []
    server.use(
      on('get', '/integrations/gocardless/mandates/import', () =>
        HttpResponse.json({
          rows: [
            candidate(),
            candidate({ mandateId: 'MD2', name: 'Bea Brown', email: null, phone: '07700 900002', postcode: 'NE1 1AA', suggestion: null, ambiguous: true }),
            candidate({ mandateId: 'MD3', name: 'Cal Cole', status: 'submitted', linkedCustomerId: 'c3', suggestion: null }),
            candidate({ mandateId: 'MD4', name: 'Dee Dunn', suggestion: null }),
          ],
        }),
      ),
      on('get', '/customers', ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')
        return HttpResponse.json({
          customers:
            search === 'be'
              ? [
                  { customerId: 'c2', customerName: 'Bea Brown' },
                  { customerId: 'c2', customerName: 'Bea Brown' },
                  { customerId: 'c5' },
                ]
              : [],
          pagination: { page: 1, pageSize: 8, total: 1, totalPages: 1 },
        })
      }),
      on('post', '/integrations/gocardless/mandates/import', async ({ request }) => {
        posted.push(await request.json())
        return HttpResponse.json({
          linked: 1,
          failed: 1,
          results: [
            { mandateId: 'MD1', customerId: 'c1', status: 'linked' },
            { mandateId: 'MD2', customerId: 'c2', status: 'failed', error: 'Bea Brown already has another Direct Debit' },
          ],
        })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<MandateImportModal onClose={onClose} />)
    // GoCardless name and the suggested RoundFlow customer.
    expect(await screen.findAllByText('Oliver Smith', { selector: 'p' })).toHaveLength(2)
    expect(screen.getByText(`(${copy.import.matchedBy.email})`)).toBeInTheDocument()
    expect(screen.getByText(copy.import.ambiguous)).toBeInTheDocument()
    expect(screen.getByText(copy.import.noMatch)).toBeInTheDocument()
    expect(screen.getByText(copy.import.alreadyLinked)).toBeInTheDocument()
    expect(screen.getByText('07700 900002 · NE1 1AA')).toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    // Pick a customer for the ambiguous row.
    const beaRow = screen.getByText('Bea Brown', { selector: 'p' }).closest('tr')!
    await user.click(within(beaRow).getByRole('button', { name: copy.import.choose }))
    await user.type(within(beaRow).getByRole('textbox'), 'be')
    const options = await within(beaRow).findAllByRole('button', { name: 'Bea Brown' })
    expect(options).toHaveLength(1)
    await user.click(options[0])
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    // Untick and re-tick Oliver.
    const oliverBox = screen.getByRole('checkbox', { name: `${copy.import.headers.select} Oliver Smith` })
    await user.click(oliverBox)
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    await user.click(oliverBox)

    await user.click(screen.getByRole('button', { name: copy.import.link }))
    expect(await screen.findByText(copy.import.doneWithFailures.replace('{linked}', '1').replace('{failed}', '1'))).toBeInTheDocument()
    expect(posted).toEqual([{ links: [{ mandateId: 'MD1', customerId: 'c1' }, { mandateId: 'MD2', customerId: 'c2' }] }])
    expect(screen.getByText('Bea Brown: Bea Brown already has another Direct Debit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.import.cancel }))
    expect(onClose).toHaveBeenCalled()
  })

  it('toasts a clean import and names an unknown mandate by its id', async () => {
    server.use(
      on('get', '/integrations/gocardless/mandates/import', () => HttpResponse.json({ rows: [candidate()] })),
      on('post', '/integrations/gocardless/mandates/import', () =>
        HttpResponse.json({ linked: 1, failed: 1, results: [{ mandateId: 'GONE', customerId: 'c1', status: 'failed', error: 'Mandate not found' }] }),
      ),
    )
    const { user } = renderWithProviders(<MandateImportModal onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: copy.import.link }))
    expect(await screen.findByText('GONE: Mandate not found')).toBeInTheDocument()

    server.use(on('post', '/integrations/gocardless/mandates/import', () => HttpResponse.json({ linked: 1, failed: 0, results: [] })))
    await user.click(screen.getByRole('button', { name: copy.import.link }))
    expect(await screen.findByText(copy.import.done.replace('{linked}', '1'))).toBeInTheDocument()
  })

  it('shows empty, load-error and save-error states', async () => {
    server.use(on('get', '/integrations/gocardless/mandates/import', () => HttpResponse.json({ rows: [] })))
    const empty = renderWithProviders(<MandateImportModal onClose={vi.fn()} />)
    expect(await screen.findByText(copy.import.empty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.import.link })).toBeDisabled()
    empty.unmount()

    server.use(on('get', '/integrations/gocardless/mandates/import', () => apiError(409, 'GoCardless is not connected.', 'GOCARDLESS_NOT_CONNECTED')))
    const failed = renderWithProviders(<MandateImportModal onClose={vi.fn()} />)
    expect(await screen.findByText('GoCardless is not connected.')).toBeInTheDocument()
    failed.unmount()

    server.use(
      on('get', '/integrations/gocardless/mandates/import', () => HttpResponse.json({ rows: [candidate()] })),
      on('post', '/integrations/gocardless/mandates/import', () => apiError(400, 'links is invalid')),
    )
    const { user } = renderWithProviders(<MandateImportModal onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: copy.import.link }))
    expect(await screen.findByText('links is invalid')).toBeInTheDocument()
  })
})

describe('setup wizard Direct Debit checkbox', () => {
  const draft = (over: Partial<PropertyDraft> = {}): PropertyDraft => ({
    ...setupWizardContent.addProperty.draftDefaults,
    customerName: 'Amelia',
    fullAddress: '1 Road',
    postcode: 'NE1 1AA',
    pricePerVisit: '20',
    serviceIds: [],
    ...over,
  })

  it('sends sendDdLink only for a Direct Debit customer who asked for it', () => {
    expect(propertyDraftToStep9Input({ ...draft({ paymentMethod: 'GOCARDLESS' }), sendDdLink: true })).toMatchObject({ sendDdLink: true })
    expect(propertyDraftToStep9Input({ ...draft({ paymentMethod: 'GOCARDLESS' }), sendDdLink: false })).not.toHaveProperty('sendDdLink')
    expect(propertyDraftToStep9Input({ ...draft({ paymentMethod: 'CASH' }), sendDdLink: true })).not.toHaveProperty('sendDdLink')
  })
})
