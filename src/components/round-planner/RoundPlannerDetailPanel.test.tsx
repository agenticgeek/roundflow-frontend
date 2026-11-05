import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const card: PlannerRoundCard = {
  key: 'r1-2099-01-01',
  roundId: 'r1',
  roundName: 'Alnwick Fri',
  date: '2099-01-01',
  stopCount: 2,
  totalValue: 40,
  completedCount: 0,
  holdCount: 0,
  issueCount: 0,
  status: 'not_started',
  technicianName: null,
}

const stop = (visitId: string, status: string) => ({
  visitId, propertyId: `p-${visitId}`, addressLine: `${visitId} High St`, postcode: 'NE66', customerName: 'Jane',
  price: 20, status, paymentHold: false, issues: [],
})

function mockStops() {
  server.use(
    on('get', '/rounds/{id}/planner/occurrences/{date}', () =>
      HttpResponse.json({
        roundId: 'r1', roundName: 'Alnwick Fri', date: '2099-01-01',
        stops: [stop('skipped1', 'SKIPPED'), stop('sched1', 'SCHEDULED')],
        summary: { stopCount: 2, totalValue: 40, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0 },
      } as never),
    ),
  )
}

function renderPanel(canMutate: boolean) {
  return renderWithProviders(
    <RoundPlannerDetailPanel card={card} currency="GBP" canMutate={canMutate} onClose={vi.fn()} onOpenList={vi.fn()} onOpenMap={vi.fn()} />,
  )
}

describe('RoundPlannerDetailPanel reschedule', () => {
  it('offers Reschedule only on skipped stops, opening the reschedule modal', async () => {
    mockStops()
    const { user } = renderPanel(true)
    expect(await screen.findByText(/skipped1 High St/)).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Reschedule' })
    expect(buttons).toHaveLength(1)
    await user.click(buttons[0])
    expect(await screen.findByText('Reschedule visit')).toBeInTheDocument()
  })

  it('hides it from read-only roles', async () => {
    mockStops()
    renderPanel(false)
    expect(await screen.findByText(/skipped1 High St/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reschedule' })).not.toBeInTheDocument()
  })
})
