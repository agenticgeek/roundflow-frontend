import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// Business closures: a round-scoped closure only warns for its own rounds, so the reschedule modal must be told which round the stop is in.
const mocks = vi.hoisted(() => ({ visit: null as unknown }))
vi.mock('@/components/round-planner/RescheduleVisitModal', () => ({
  RescheduleVisitModal: (props: { visit: unknown }) => {
    mocks.visit = props.visit
    return null
  },
}))

const card: PlannerRoundCard = {
  key: 'r1-2099-01-01', roundId: 'r1', roundName: 'Alnwick Fri', date: '2099-01-01', stopCount: 1, totalValue: 20, completedCount: 0,
  holdCount: 0, issueCount: 0, status: 'not_started', technicianName: null, projected: false,
}

describe('RoundPlannerDetailPanel reschedule and closures', () => {
  it('passes the round id of the card to the reschedule modal', async () => {
    server.use(
      on('get', '/rounds/{id}/planner/occurrences/{date}', () =>
        HttpResponse.json({
          roundId: 'r1', roundName: 'Alnwick Fri', date: '2099-01-01',
          stops: [{ visitId: 'skipped1', propertyId: 'p1', addressLine: 'skipped1 High St', postcode: 'NE66', customerName: 'Jane', price: 20, status: 'SKIPPED', paymentHold: false, issues: [] }],
          summary: { stopCount: 1, totalValue: 20, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0 },
        } as never),
      ),
    )
    const { user } = renderWithProviders(
      <RoundPlannerDetailPanel card={card} currency="GBP" canMutate onClose={vi.fn()} onOpenList={vi.fn()} onOpenMap={vi.fn()} />,
    )
    expect(await screen.findByText(/skipped1 High St/)).toBeInTheDocument()
    expect(mocks.visit).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(mocks.visit).toMatchObject({ visitId: 'skipped1', roundId: 'r1' })
  })
})
