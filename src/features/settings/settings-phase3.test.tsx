import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { useLocation } from 'react-router-dom'
import { KpiThresholdsPanel } from '@/components/settings/KpiThresholdsPanel'
import { GHL_STATUS_KEY } from '@/features/settings/hooks/useGhl'
import {
  readIntegrationReturn,
  useIntegrationReturn,
  type IntegrationReturn,
} from '@/features/settings/hooks/useIntegrationReturn'
import { KPI_THRESHOLDS_KEY } from '@/features/settings/hooks/useKpiThresholds'
import {
  cleanMethodFromForm,
  cleanMethodToForm,
  noDirectDebitFromForm,
  noDirectDebitToForm,
  parseInvoiceDueDays,
  paymentTimingFromForm,
  paymentTimingToForm,
  reminderFromForm,
  reminderToForm,
} from '@/features/settings/lib/business-rules'
import { toBulkRowErrors } from '@/features/setup/lib/bulk-errors'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { createTestQueryClient, renderWithProviders } from '@/test/render'

describe('readIntegrationReturn (GAP-017 part 2)', () => {
  it('reads the GHL and Stripe OAuth returns', () => {
    expect(readIntegrationReturn('?ghl=connected&webhookUrl=x')).toEqual({
      provider: 'ghl',
      ok: true,
      message: 'GoHighLevel connected',
    })
    expect(readIntegrationReturn('?ghl=error&message=Denied')).toEqual({
      provider: 'ghl',
      ok: false,
      message: 'GoHighLevel wasn’t connected: Denied',
    })
    expect(readIntegrationReturn('?ghl=error')!.message).toBe('GoHighLevel wasn’t connected. Try again.')
    expect(readIntegrationReturn('?stripe=connected')).toMatchObject({ provider: 'stripe', ok: true })
    expect(readIntegrationReturn('?stripe=error&message=Nope')).toMatchObject({ provider: 'stripe', ok: false })
    expect(readIntegrationReturn('?stripe=error')).toMatchObject({ provider: 'stripe', ok: false })
    expect(readIntegrationReturn('?step=2')).toBeNull()
  })
})

function ReturnProbe({ onReturn }: { onReturn?: (result: IntegrationReturn) => void }) {
  const result = useIntegrationReturn(onReturn)
  const location = useLocation()
  return (
    <p>
      {result?.provider ?? 'none'} {location.pathname}
      {location.search}
    </p>
  )
}

describe('useIntegrationReturn', () => {
  it('toasts once, refreshes the connection status and keeps the other params', async () => {
    const onReturn = vi.fn()
    const queryClient = createTestQueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    renderWithProviders(<ReturnProbe onReturn={onReturn} />, {
      route: '/setup?step=2&ghl=connected&webhookUrl=https%3A%2F%2Fx',
      queryClient,
    })
    expect(await screen.findByText('GoHighLevel connected')).toBeInTheDocument()
    expect(screen.getByText('ghl /setup?step=2')).toBeInTheDocument()
    expect(onReturn).toHaveBeenCalledWith(expect.objectContaining({ provider: 'ghl', ok: true }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: GHL_STATUS_KEY }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.setup.step(2) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.setup.status })
  })

  it('strips the whole query when only result params were there, and works without a callback', async () => {
    renderWithProviders(<ReturnProbe />, { route: '/settings/integrations?stripe=error&message=Declined' })
    expect(await screen.findByText('Stripe wasn’t connected: Declined', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('stripe /settings/integrations')).toBeInTheDocument()
  })

  it('does nothing without a result', () => {
    renderWithProviders(<ReturnProbe />, { route: '/settings?tab=profile' })
    expect(screen.getByText('none /settings?tab=profile')).toBeInTheDocument()
  })
})

describe('business rules (GAP-001 / GAP-003 / GAP-008)', () => {
  const defaults = { reminderSchedule: 'evening-before' as const, eveningReminderTime: '18:00', morningReminderTime: '07:00' }

  it('maps reminders both ways, keeping a time per schedule', () => {
    expect(reminderToForm({ reminderMode: 'MORNING_OF', reminderTime: '06:30' }, defaults)).toEqual({
      reminderSchedule: 'morning-of',
      eveningReminderTime: '18:00',
      morningReminderTime: '06:30',
    })
    expect(reminderToForm({ reminderMode: 'EVENING_BEFORE', reminderTime: '19:00' }, defaults).eveningReminderTime).toBe('19:00')
    expect(reminderToForm({ reminderMode: 'NONE' }, defaults).reminderSchedule).toBe('none')
    expect(reminderToForm(null, defaults)).toEqual(defaults)
    expect(reminderToForm({ reminderMode: 'EVENING_BEFORE' }, defaults).eveningReminderTime).toBe('18:00')

    expect(reminderFromForm({ ...defaults, reminderSchedule: 'none' })).toEqual({ reminderMode: 'NONE' })
    expect(reminderFromForm(defaults)).toEqual({ reminderMode: 'EVENING_BEFORE', reminderTime: '18:00' })
    expect(reminderFromForm({ ...defaults, reminderSchedule: 'morning-of' })).toEqual({
      reminderMode: 'MORNING_OF',
      reminderTime: '07:00',
    })
  })

  it('maps clean method, no-direct-debit action and payment timing', () => {
    expect(cleanMethodToForm('WATER_FED_POLE', 'traditional')).toBe('water-fed-pole')
    expect(cleanMethodToForm(null, 'both')).toBe('both')
    expect(cleanMethodFromForm('both')).toBe('BOTH')
    expect(noDirectDebitToForm('SEND_PAYMENT_LINK', 'invoice')).toBe('card-link')
    expect(noDirectDebitToForm(undefined, 'invoice')).toBe('invoice')
    expect(noDirectDebitFromForm('card-link')).toBe('SEND_PAYMENT_LINK')
    expect(paymentTimingToForm('COLLECT_DAILY_BATCH')).toBe('daily')
    expect(paymentTimingToForm('COLLECT_AFTER_VISIT')).toBe('after-visit')
    expect(paymentTimingToForm(null)).toBe('after-visit')
    expect(paymentTimingFromForm('daily')).toBe('COLLECT_DAILY_BATCH')
    expect(paymentTimingFromForm('after-visit')).toBe('COLLECT_AFTER_VISIT')
  })

  it('parses invoice due days 0–90', () => {
    expect(parseInvoiceDueDays(' 14 ')).toBe(14)
    expect(parseInvoiceDueDays('0')).toBe(0)
    expect(parseInvoiceDueDays('90')).toBe(90)
    expect(parseInvoiceDueDays('91')).toBeNull()
    expect(parseInvoiceDueDays('7.5')).toBeNull()
    expect(parseInvoiceDueDays('')).toBeNull()
  })
})

describe('toBulkRowErrors (GAP-009)', () => {
  it('reads `error`, falls back to `message`, and drops the rest', () => {
    expect(
      toBulkRowErrors([
        { row: 0, field: 'postcode', error: 'Postcode is required' },
        { row: '2', field: 'unknown', message: 'Bad row' },
        { row: 3, error: 42, message: 'Old copy' },
        { row: 4 },
        null,
      ]),
    ).toEqual([
      { row: 0, field: 'postcode', message: 'Postcode is required' },
      { row: 2, field: undefined, message: 'Bad row' },
      { row: 3, field: undefined, message: 'Old copy' },
    ])
    expect(toBulkRowErrors({ errors: [] })).toEqual([])
  })
})

const threshold = { id: 'k1', metric: 'strikes' as const, operator: 'GT' as const, value: 3 }

describe('KpiThresholdsPanel (GAP-025)', () => {
  it('edits, validates and saves the whole list', async () => {
    const hold = gate()
    let body: unknown
    server.use(
      on('get', '/settings/kpi-thresholds', () => specJson('/settings/kpi-thresholds', 'get', 200, [threshold])),
      on('put', '/settings/kpi-thresholds', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return specJson('/settings/kpi-thresholds', 'put', 200, [
          threshold,
          { id: 'k2', metric: 'revenuePerHour', operator: 'LT', value: 12.5 },
        ])
      }),
    )
    const { user, queryClient } = renderWithProviders(<KpiThresholdsPanel canMutate />)
    expect(await screen.findByLabelText('Value 1')).toHaveValue('3')
    expect(screen.getByRole('button', { name: 'Save thresholds' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Add threshold' }))
    await user.click(screen.getByRole('button', { name: 'Save thresholds' }))
    expect(screen.getByText('Each threshold needs a value of 0 or more.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Metric 2' }))
    await user.click(screen.getByRole('option', { name: 'Revenue per hour (£)' }))
    expect(screen.queryByText('Each threshold needs a value of 0 or more.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alert when 2' }))
    await user.click(screen.getByRole('option', { name: 'is below' }))
    await user.type(screen.getByLabelText('Value 2'), '£12.5')
    expect(screen.getByLabelText('Value 2')).toHaveValue('12.5')

    await user.click(screen.getByRole('button', { name: 'Save thresholds' }))
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    hold.release()
    expect(await screen.findByText('KPI thresholds saved')).toBeInTheDocument()
    expect(body).toEqual([
      { metric: 'strikes', operator: 'GT', value: 3 },
      { metric: 'revenuePerHour', operator: 'LT', value: 12.5 },
    ])
    expect(queryClient.getQueryData(KPI_THRESHOLDS_KEY)).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Save thresholds' })).toBeDisabled()
  })

  it('removes a row and shows the server’s reason for a rejected save', async () => {
    server.use(
      on('get', '/settings/kpi-thresholds', () =>
        specJson('/settings/kpi-thresholds', 'get', 200, [threshold, { ...threshold, id: 'k2', metric: 'damages' }]),
      ),
      on('put', '/settings/kpi-thresholds', () => apiError(400, 'Duplicate threshold: strikes GT')),
    )
    const { user } = renderWithProviders(<KpiThresholdsPanel canMutate />)
    await user.click(await screen.findByRole('button', { name: 'Remove threshold 2' }))
    expect(screen.queryByLabelText('Value 2')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save thresholds' }))
    expect(await screen.findByText('Duplicate threshold: strikes GT')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove threshold 1' }))
    expect(screen.getByText('No thresholds yet — add one to start getting KPI alerts.')).toBeInTheDocument()
  })

  it('explains a load failure and retries', async () => {
    let fail = true
    server.use(
      on('get', '/settings/kpi-thresholds', () =>
        fail ? apiError(500, 'boom') : specJson('/settings/kpi-thresholds', 'get', 200, []),
      ),
    )
    const { user, container } = renderWithProviders(<KpiThresholdsPanel canMutate />)
    expect(container.querySelector('[aria-busy], .animate-pulse')).not.toBeNull()
    expect(await screen.findByText('Could not load KPI thresholds.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No thresholds yet — add one to start getting KPI alerts.')).toBeInTheDocument()
  })

  it('is read-only for staff', async () => {
    server.use(on('get', '/settings/kpi-thresholds', () => HttpResponse.json([threshold])))
    renderWithProviders(<KpiThresholdsPanel canMutate={false} />)
    expect(await screen.findByText('Only admins and managers can change thresholds.')).toBeInTheDocument()
    expect(screen.getByLabelText('Value 1')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Add threshold' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove threshold 1' })).not.toBeInTheDocument()
  })
})
