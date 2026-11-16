import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { RoundPlannerCalendar } from '@/components/round-planner/RoundPlannerCalendar'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'

const base: PlannerRoundCard = {
  key: 'r1:2026-11-12', roundId: 'r1', roundName: 'Alnwick Fri', date: '2026-11-12', stopCount: 12,
  totalValue: 300, completedCount: 0, holdCount: 0, issueCount: 0, status: 'not_started',
  technicianName: null, projected: false,
}

function setup(cards: PlannerRoundCard[]) {
  const onSelectCard = vi.fn()
  const onAssignCard = vi.fn()
  const cardsByDate = new Map<string, PlannerRoundCard[]>()
  for (const c of cards) cardsByDate.set(c.date, [...(cardsByDate.get(c.date) ?? []), c])
  renderWithProviders(
    <RoundPlannerCalendar
      weeks={[{ id: 'w', dates: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'] }]}
      cardsByDate={cardsByDate} dayHeaders={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
      emptyLabel="No rounds" stopsLabel="stops" unassignedLabel="Unassigned" today="2026-11-12" currency="GBP"
      loading={false} onSelectCard={onSelectCard} onAssignCard={onAssignCard} assignLabel="Assign"
    />,
  )
  return { onSelectCard, onAssignCard }
}

describe('RoundPlannerCalendar cards', () => {
  it('real card stays interactive', async () => {
    const { onSelectCard, onAssignCard } = setup([base])
    await userEvent.click(screen.getByText('Alnwick Fri'))
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))
    expect(onSelectCard).toHaveBeenCalledOnce()
    expect(onAssignCard).toHaveBeenCalledOnce()
    expect(screen.queryByText('Projected')).not.toBeInTheDocument()
  })

  it('projected card is a light, non-interactive estimate', async () => {
    const { onSelectCard } = setup([{ ...base, projected: true }])
    const item = screen.getByLabelText('Projected visit, estimate')
    expect(item).toHaveClass('border-dashed')
    expect(screen.getByText('Projected')).toBeInTheDocument()
    expect(item).toHaveTextContent('~12 stops · ~£300.00')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    await userEvent.click(item)
    expect(onSelectCard).not.toHaveBeenCalled()
  })
})
