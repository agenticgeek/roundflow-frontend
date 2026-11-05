import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { PropertyDetailScreen } from '@/components/property-detail/PropertyDetailScreen'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { addDays, todayIsoDate } from '@/features/rounds/lib/planner'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function recordFor(plan: Record<string, unknown>, standing: Record<string, unknown> = {}) {
  const base = customerDetailFixture()
  return customerDetailToPropertyRecord(
    customerDetailFixture({
      servicePlans: [{ ...base.servicePlans![0]!, ...plan }] as never,
      standingInfo: { ...base.standingInfo, ...standing } as never,
    }),
  )!
}

function renderScreen(property: ReturnType<typeof recordFor>) {
  server.use(on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: false, gocardlessConnected: false })))
  return renderWithProviders(<PropertyDetailScreen property={property} customerId="c1" onBack={vi.fn()} />)
}

describe('property detail pause / resume states', () => {
  it('maps the raw payment method, paused flag and a scheduled pause date', () => {
    const future = addDays(todayIsoDate(), 10)
    const record = recordFor({ paymentMethod: 'CHEQUE', pauseStartDate: future })
    expect(record.paymentMethodCode).toBe('CHEQUE')
    expect(record.planPaused).toBe(false)
    expect(record.pauseScheduledFor).toBeTruthy()
    expect(recordFor({ status: 'PAUSED', pauseStartDate: future }).planPaused).toBe(true)
    expect(recordFor({ pauseStartDate: '2020-01-01' }).pauseScheduledFor).toBeNull()
  })

  it('shows the scheduled pause with a cancel control instead of a second Pause', () => {
    renderScreen(recordFor({ pauseStartDate: addDays(todayIsoDate(), 10) }))
    expect(screen.getByText(/^Pause scheduled for /)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel scheduled pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause Service' })).not.toBeInTheDocument()
  })

  it('offers Pause for a plain active plan', () => {
    renderScreen(recordFor({}))
    expect(screen.getByRole('button', { name: 'Pause Service' })).toBeInTheDocument()
  })

  it('still offers Pause when a payment hold is showing', () => {
    renderScreen(recordFor({}, { paymentStatus: 'hold' }))
    expect(screen.getByRole('button', { name: 'Pause Service' })).toBeInTheDocument()
  })

  it('offers Resume for a paused plan even under a payment hold', () => {
    renderScreen(recordFor({ status: 'PAUSED' }, { paymentStatus: 'hold' }))
    expect(screen.getByRole('button', { name: 'Resume Service' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause Service' })).not.toBeInTheDocument()
  })
})
