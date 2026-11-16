import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { RoundPlannerCalendar } from '@/components/round-planner/RoundPlannerCalendar'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import type { Closure } from '@/features/closures/types'

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

// Business closures: shading with a text label, round scoping, window edges.

const week = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']

function closureFixture(overrides: Partial<Closure> = {}): Closure {
  return {
    id: 'c1', label: 'Staff holiday', startDate: '2026-11-11', endDate: '2026-11-12', mode: 'MOVE', notifyCustomers: false,
    roundIds: [], appliedAt: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...overrides,
  }
}

function renderClosures(props: { closures?: Closure[]; closureRoundId?: string } = {}) {
  return renderWithProviders(
    <RoundPlannerCalendar
      weeks={[{ id: 'w', dates: week }]}
      cardsByDate={new Map()} dayHeaders={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
      emptyLabel="No rounds" stopsLabel="stops" unassignedLabel="Unassigned" today="2026-11-12" currency="GBP"
      loading={false} onSelectCard={vi.fn()} assignLabel="Assign" {...props}
    />,
  )
}

describe('RoundPlannerCalendar closures', () => {
  it('shows nothing extra when there are no closures', () => {
    const { container } = renderClosures()
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
    expect(container.querySelector('[data-closed]')).toBeNull()
    renderClosures({ closures: [] })
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
  })

  it('shades each closed day and labels it in text, not by colour alone', () => {
    const { container } = renderClosures({ closures: [closureFixture()] })
    expect(screen.getAllByText('Closed: Staff holiday')).toHaveLength(2)
    expect(container.querySelectorAll('[data-closed="true"]')).toHaveLength(2)
    expect(screen.getAllByText('Closed: Staff holiday')[0]).toHaveAttribute('title', 'Closed: Staff holiday (Wed 11 Nov 2026 to Thu 12 Nov 2026)')
    // The hatch pattern is on the shaded cells, so the mark is not colour alone.
    expect(container.querySelector('[data-closed="true"]')?.className).toContain('repeating-linear-gradient')
    // The icon is decorative; the text carries the meaning.
    expect(container.querySelector('p[title] svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('handles a closure that runs past the window edge', () => {
    const { container } = renderClosures({ closures: [closureFixture({ startDate: '2026-11-14', endDate: '2026-12-31' })] })
    expect(container.querySelectorAll('[data-closed="true"]')).toHaveLength(2)
  })

  it('labels several overlapping closures on the same day', () => {
    renderClosures({ closures: [closureFixture(), closureFixture({ id: 'c2', label: 'Training', startDate: '2026-11-12', endDate: '2026-11-12' })] })
    expect(screen.getAllByText(/Closed:/)).toHaveLength(3)
    expect(screen.getByText('Closed: Training')).toBeInTheDocument()
  })

  it('labels a round-scoped closure but only shades the day when that round is the filter', () => {
    const scoped = closureFixture({ roundIds: ['r1'] })
    const all = renderClosures({ closures: [scoped] })
    expect(screen.getAllByText('Closed: Staff holiday')).toHaveLength(2)
    expect(all.container.querySelectorAll('[data-closed="true"]')).toHaveLength(0)
    all.unmount()

    const same = renderClosures({ closures: [scoped], closureRoundId: 'r1' })
    expect(same.container.querySelectorAll('[data-closed="true"]')).toHaveLength(2)
    same.unmount()

    const other = renderClosures({ closures: [scoped], closureRoundId: 'r2' })
    expect(other.container.querySelectorAll('[data-closed="true"]')).toHaveLength(0)
    expect(screen.queryByText(/Closed:/)).not.toBeInTheDocument()
  })
})
