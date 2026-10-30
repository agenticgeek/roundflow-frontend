import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  shown: [] as { visitId: string }[],
  requests: [] as { date: string; roundIds: string[] }[][],
  enabled: [] as boolean[],
}))

function plannerStop(visitId: string, overrides: Record<string, unknown> = {}) {
  return {
    visitId,
    propertyId: 'p1',
    addressLine: `${visitId} Hotspur Street`,
    postcode: 'NE66 1TD',
    customerName: 'Jo',
    price: 20,
    status: 'SCHEDULED',
    paymentHold: false,
    issues: [],
    technicianId: 't1',
    ...overrides,
  }
}

vi.mock('@/components/round-planner/RoundPlannerMapView', () => ({
  RoundPlannerMapView: ({ stops }: { stops: { visitId: string }[] }) => {
    mocks.shown = stops
    return <p>{`pins: ${stops.map((stop) => stop.visitId).join(',')}`}</p>
  },
}))
vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRoundsOccurrenceDays: (requests: { date: string; roundIds: string[] }[], enabled: boolean) => {
    mocks.requests.push(requests)
    mocks.enabled.push(enabled)
    return {
      isLoading: false,
      isError: false,
      byDate: new Map([
        ['2026-11-03', new Map([['r1', { roundId: 'r1', roundName: 'Fri', stops: [plannerStop('tue')] }]])],
        [
          '2026-11-05',
          new Map([['r1', { roundId: 'r1', roundName: 'Fri', stops: [plannerStop('thu'), plannerStop('other', { technicianId: 't2' })] }]]),
        ],
      ]),
    }
  },
}))

const { RoundPlannerMapSection } = await import('@/components/round-planner/RoundPlannerMapSection')

const dayStops = [{ ...plannerStop('today'), roundId: 'r1', roundName: 'Fri' }] as PlannerListStop[]

function Harness({ minDate = '2026-11-02', maxDate = '2026-11-08' }: { minDate?: string; maxDate?: string }) {
  const [date, setDate] = useState('2026-11-05')
  return (
    <>
      <output aria-label="selected">{date}</output>
      <RoundPlannerMapSection
        rounds={[{ id: 'r1', name: 'Fri' }]}
        dayStops={dayStops}
        filter={{ technicianId: 't1', statusId: 'all', query: '' }}
        selectedDate={date}
        minDate={minDate}
        maxDate={maxDate}
        onDateChange={setDate}
        currency="GBP"
      />
    </>
  )
}

beforeEach(() => {
  mocks.requests = []
  mocks.enabled = []
})

describe('RoundPlannerMapSection (GAP-023)', () => {
  it('day mode shows the day’s stops and steps a day at a time', async () => {
    const { user } = renderWithProviders(<Harness />)
    expect(screen.getByText('pins: today')).toBeInTheDocument()
    expect(mocks.enabled.at(-1)).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-06')
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-05')
  })

  it('week mode fetches the 7 days and pins every matching stop', async () => {
    const { user } = renderWithProviders(<Harness minDate="2026-10-01" maxDate="2026-12-31" />)
    await user.click(screen.getByRole('radio', { name: 'Week' }))
    expect(mocks.enabled.at(-1)).toBe(true)
    expect(mocks.requests.at(-1)?.map((request) => request.date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ])
    // The technician filter drops t2's stop.
    expect(screen.getByText('pins: tue,thu')).toBeInTheDocument()
    expect(screen.getByText('Week of 2 Nov')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-12')
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-05')
  })

  it('greys out the arrows at the edge of the planner window', () => {
    renderWithProviders(<Harness minDate="2026-11-05" maxDate="2026-11-05" />)
    expect(screen.getByRole('button', { name: 'Previous day' })).toHaveClass('pointer-events-none')
    expect(screen.getByRole('button', { name: 'Next day' })).toHaveClass('pointer-events-none')
  })

  it('the date picker jumps, ignoring a cleared value', () => {
    renderWithProviders(<Harness />)
    const input = screen.getByLabelText('Date')
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-05')
    fireEvent.change(input, { target: { value: '2026-11-07' } })
    expect(screen.getByLabelText('selected')).toHaveTextContent('2026-11-07')
  })
})
