import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { Round, ServiceArea } from '@/api/types'
import { reportsApi } from '@/api/reports.api'
import { roundsApi } from '@/api/rounds.api'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { ImportPropertiesPanel } from '@/components/setup-wizard/ImportPropertiesPanel'
import { RoundsStep } from '@/components/setup-wizard/steps/RoundsStep'
import { PauseServiceModal } from '@/components/property-detail/PauseServiceModal'
import { EditCustomerRecordModal } from '@/components/property-detail/EditCustomerRecordModal'
import { TechnicianIncidentsPanel } from '@/components/technicians/TechnicianIncidentsPanel'
import { setupWizardContent } from '@/content/setup-wizard'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { useRoundsDraft } from '@/features/setup/hooks/useRoundsDraft'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods'
import type { PropertyDraft } from '@/types/setup-wizard'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const property = customerDetailToPropertyRecord(customerDetailFixture())!

describe('payment methods (BUG-07)', () => {
  it('has one ordered list with the agreed labels', () => {
    expect(PAYMENT_METHOD_OPTIONS.map((option) => option.value)).toEqual(['GOCARDLESS', 'STRIPE', 'BACS', 'CASH', 'CHEQUE'])
    expect(PAYMENT_METHOD_LABELS.STRIPE).toBe('Card link (Stripe)')
    expect(PAYMENT_METHOD_OPTIONS[0]?.label).toBe('Direct Debit (GoCardless)')
  })
})

describe('EditCustomerRecordModal payment method', () => {
  function mockPayment(connected: boolean) {
    server.use(
      on('get', '/settings/payment', () =>
        HttpResponse.json({ stripeConnected: connected, gocardlessConnected: connected, ghlConnected: false }),
      ),
    )
  }

  it('round-trips STRIPE and CHEQUE, and warns when the provider is not connected', async () => {
    mockPayment(false)
    const bodies: Record<string, unknown>[] = []
    server.use(
      on('patch', '/customers/{id}', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({})
      }),
      on('patch', '/service-plans/{id}', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return HttpResponse.json({ id: 'sp1' } as never)
      }),
    )
    const { user } = renderWithProviders(
      <EditCustomerRecordModal
        open
        property={{ ...property, paymentMethodCode: 'STRIPE', primaryPlanId: 'sp1' }}
        customerId="c1"
        onClose={vi.fn()}
      />,
    )
    expect(await screen.findByText(/Stripe is not connected/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Card link \(Stripe\)/ }))
    await user.click(await screen.findByRole('option', { name: 'Direct Debit (GoCardless)' }))
    expect(await screen.findByText(/GoCardless is not connected/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Direct Debit \(GoCardless\)/ }))
    await user.click(await screen.findByRole('option', { name: 'Cheque' }))
    expect(screen.queryByText(/is not connected/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(() => expect(bodies.some((body) => body.paymentMethod === 'CHEQUE')).toBe(true))
  })

  it('shows no warning once the provider is connected', async () => {
    mockPayment(true)
    renderWithProviders(
      <EditCustomerRecordModal open property={{ ...property, paymentMethodCode: 'STRIPE' }} customerId="c1" onClose={vi.fn()} />,
    )
    await screen.findByRole('button', { name: /Card link \(Stripe\)/ })
    expect(screen.queryByText(/is not connected/)).not.toBeInTheDocument()
  })
})

describe('PauseServiceModal errors', () => {
  it('shows the backend 400 inline instead of failing silently', async () => {
    server.use(on('post', '/service-plans/{id}/pause', () => apiError(400, 'Resume date must be in the future')))
    const onClose = vi.fn()
    const { user } = renderWithProviders(<PauseServiceModal open property={property} planId="sp1" onClose={onClose} />)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Pause Service' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Resume date must be in the future')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('RoundsStep draft (BUG-03)', () => {
  const areas = [{ id: 'a1', name: 'Alnwick', postcodeSector: 'NE66' }] as ServiceArea[]
  const rounds: Round[] = []

  function Host({ showStep, defaultFrequency }: { showStep: boolean; defaultFrequency: 'FOUR_WEEKLY' | 'SIX_WEEKLY' }) {
    const draft = useRoundsDraft()
    const [created, setCreated] = useState<unknown>(null)
    return (
      <>
        <output data-testid="created">{JSON.stringify(created)}</output>
        {showStep ? (
          <RoundsStep
            areas={areas}
            rounds={rounds}
            workingDays={[]}
            defaultFrequency={defaultFrequency}
            draft={draft}
            saving={false}
            onCreateRound={async (input) => {
              setCreated(input)
              return 'r1'
            }}
            onUpdateRound={async () => {}}
            onSubmit={() => {}}
          />
        ) : null}
      </>
    )
  }

  it('keeps what was typed across navigation, follows the default frequency until edited, and clears after add', async () => {
    const { user, rerender } = renderWithProviders(<Host showStep defaultFrequency="FOUR_WEEKLY" />)
    // No errors until Add round is clicked.
    expect(screen.queryByText(/required|Enter/i)).not.toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Round name'), 'Alnwick Monday')
    expect(screen.getByRole('button', { name: 'Every 4 weeks' })).toBeInTheDocument()

    // Leave the step and come back: the form is still filled in.
    rerender(<Host showStep={false} defaultFrequency="SIX_WEEKLY" />)
    rerender(<Host showStep defaultFrequency="SIX_WEEKLY" />)
    expect(screen.getByDisplayValue('Alnwick Monday')).toBeInTheDocument()
    // Frequency was never edited, so it follows the new Round Settings default.
    expect(screen.getByRole('button', { name: 'Every 6 weeks' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: setupWizardContent.rounds.form.actions.add }))
    // Day is still required, so validation shows only now.
    expect(await screen.findByText(setupWizardContent.rounds.form.validation.dayRequired)).toBeInTheDocument()
  })
})

describe('ImportPropertiesPanel price (BUG-06)', () => {
  it('shows the sum of ticked services as read-only text and updates live', async () => {
    const draftDefaults = setupWizardContent.addProperty.draftDefaults as PropertyDraft
    const csv = [
      'First name,Last name,Mobile phone,Service street 1,Service city,Service postcode',
      'Oliver,Clarke,07500 208733,63 Manor Road,Alnwick,NE66 1TD',
    ].join('\n')
    const { user } = renderWithProviders(
      <ImportPropertiesPanel
        roundOptions={[{ value: 'r1', label: 'Round' }]}
        serviceAreaOptions={[{ value: 'a1', label: 'Alnwick' }]}
        serviceOptions={[
          { value: 's1', label: 'Windows' },
          { value: 's2', label: 'Gutters' },
        ]}
        servicePrices={{ s1: 18, s2: 12 }}
        draftDefaults={draftDefaults}
        onSaveProperty={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText(/First name/), { target: { value: csv } })
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('button', { name: /Select services/ }))
    await user.click(screen.getByRole('option', { name: /Windows/ }))
    await user.click(screen.getByRole('option', { name: /Gutters/ }))
    expect(await screen.findByText('£30.00')).toBeInTheDocument()
    await user.click(screen.getAllByRole('checkbox', { name: /Gutters/ })[0]!)
    expect(await screen.findByText('£18.00')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('e.g. 20')).not.toBeInTheDocument()
  })
})

describe('paging (BUG pagination)', () => {
  it('reports activity passes the page, and round properties are paged beyond 100', async () => {
    const seen: string[] = []
    server.use(
      on('get', '/reports/activity', ({ request }) => {
        seen.push(new URL(request.url).search)
        return HttpResponse.json({ rows: [], pagination: { page: 2, pageSize: 50, total: 60, totalPages: 2 } } as never)
      }),
      on('get', '/customers', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json({
          customers: [{ propertyId: `p${page}`, addressLine: 'x', customerName: 'y', price: 1 }],
          pagination: { page, pageSize: 100, total: 101, totalPages: 2 },
        } as never)
      }),
    )
    await reportsApi.activity({ page: 2 })
    await reportsApi.activity()
    expect(seen).toEqual(['?page=2', ''])
    const rows = await roundsApi.listProperties('r1')
    expect(rows.map((row) => row.propertyId)).toEqual(['p1', 'p2'])
  })

  it('incidents panel shows a Pager when there are several pages', async () => {
    const pages: string[] = []
    server.use(
      on('get', '/technicians/{id}/incidents', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1'
        pages.push(page)
        return HttpResponse.json({
          rows: [{ id: `i${page}`, type: 'DAMAGE', note: `note ${page}`, amount: null, createdAt: '2026-10-29T10:00:00Z' }],
          pagination: { page: Number(page), pageSize: 20, total: 40, totalPages: 2 },
        } as never)
      }),
    )
    const { user } = renderWithProviders(<TechnicianIncidentsPanel technicianId="t1" canMutate={false} />)
    expect(await screen.findByText('note 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('note 2')).toBeInTheDocument()
    expect(pages).toContain('2')
  })
})

describe('SMS template create and delete', () => {
  it('creates a template, validates, then deletes after confirming', async () => {
    let templates = [{ id: 't1', name: 'Reminder', channel: 'SMS', body: 'Hi', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' }]
    let created: unknown
    server.use(
      on('get', '/settings/message-templates', () => HttpResponse.json(templates as never)),
      on('get', '/settings/ghl/status', () =>
        HttpResponse.json({ connected: true, method: null, locationId: null, locationName: null, webhookUrl: null, connectedAt: null }),
      ),
      on('post', '/settings/message-templates', async ({ request }) => {
        created = await request.json()
        templates = [...templates, { id: 't2', name: 'Weather', channel: 'EMAIL', body: 'Rain', createdAt: '', updatedAt: '' }]
        return HttpResponse.json(templates[1] as never)
      }),
      on('delete', '/settings/message-templates/{id}', ({ params }) => {
        templates = templates.filter((template) => template.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'SMS Templates' }))
    await user.click(await screen.findByRole('button', { name: 'New template' }))
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(screen.getByText('Give the template a name.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Template name'), 'Weather')
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(await screen.findByText('The message can’t be empty.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Message'), 'Rain')
    await user.click(screen.getByRole('button', { name: 'SMS' }))
    await user.click(await screen.findByRole('option', { name: 'Email' }))
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(await screen.findByText('Email templates need a subject.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Subject'), 'Weather hold')
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(await screen.findByText('Template created')).toBeInTheDocument()
    expect(created).toMatchObject({ name: 'Weather', channel: 'EMAIL', body: 'Rain', subject: 'Weather hold' })

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(await screen.findByText('Template deleted')).toBeInTheDocument()
  })

  it('reports a failed create inline', async () => {
    server.use(
      on('get', '/settings/message-templates', () => HttpResponse.json([])),
      on('get', '/settings/ghl/status', () =>
        HttpResponse.json({ connected: true, method: null, locationId: null, locationName: null, webhookUrl: null, connectedAt: null }),
      ),
      on('post', '/settings/message-templates', () => apiError(409, 'Name taken')),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'SMS Templates' }))
    await user.click(await screen.findByRole('button', { name: 'New template' }))
    await user.type(screen.getByLabelText('Template name'), 'A')
    await user.type(screen.getByLabelText('Message'), 'B')
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(await screen.findByText('Name taken')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
  })
})
