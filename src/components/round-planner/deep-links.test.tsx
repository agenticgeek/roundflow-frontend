import { describe, expect, it, vi } from 'vitest'
import { renderHook, screen } from '@testing-library/react'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { RoundPlannerListView } from '@/components/round-planner/RoundPlannerListView'
import { useRoundPlannerInteractions } from '@/hooks/use-round-planner-interactions'
import { roundPlannerContent } from '@/content/round-planner'
import { renderWithProviders } from '@/test/render'

const stop = (visitId: string) =>
  ({
    visitId,
    propertyId: 'p',
    addressLine: `${visitId} High Street`,
    postcode: 'NE1',
    customerName: 'Jo',
    price: 10,
    status: 'SCHEDULED',
    paymentHold: false,
    issues: [],
    roundId: 'r1',
    roundName: 'Alnwick Fri',
  }) as PlannerListStop

describe('Round Planner deep links', () => {
  it('opens the list on the linked round and day with the visit expanded', () => {
    const { result } = renderHook(() => useRoundPlannerInteractions({ round: 'r1', date: '2026-11-09', visitId: 'v2' }))
    expect(result.current).toMatchObject({
      roundId: 'r1',
      selectedDate: '2026-11-09',
      anchorDate: '2026-11-09',
      view: 'list',
      expandedStopId: 'v2',
      highlightVisitId: 'v2',
    })
  })

  it('keeps the defaults without a link', () => {
    const { result } = renderHook(() => useRoundPlannerInteractions())
    expect(result.current.roundId).toBe('all')
    expect(result.current.view).toBe(roundPlannerContent.defaults.view)
    expect(result.current.expandedStopId).toBeNull()
    expect(result.current.highlightVisitId).toBeNull()
  })

  it('focuses and marks the linked row', () => {
    Element.prototype.scrollIntoView = vi.fn()
    renderWithProviders(
      <table>
        <RoundPlannerListView
          stops={[stop('v1'), stop('v2')]}
          selectedDate="2026-11-09"
          minDate="2026-11-02"
          maxDate="2026-11-29"
          onDateChange={vi.fn()}
          onPreviousDay={vi.fn()}
          onNextDay={vi.fn()}
          expandedStopId={null}
          highlightVisitId="v2"
          onToggleStop={vi.fn()}
          onViewDetails={vi.fn()}
          onBulkMessage={vi.fn()}
          onAddOneOffJob={vi.fn()}
          canMutate
          currency="GBP"
          loading={false}
          filteredOut={false}
        />
      </table>,
    )
    const row = screen.getByText('v2 High Street').closest('tr')!
    expect(row).toHaveFocus()
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('v1 High Street').closest('tr')).not.toHaveAttribute('aria-current')
  })
})
