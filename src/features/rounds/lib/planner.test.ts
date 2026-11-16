import { describe, expect, it } from 'vitest'
import { buildRoundCards, sumKpis } from '@/features/rounds/lib/planner'

const occ = { stopCount: 4, totalValue: 100, completedCount: 2, completionPct: 50, holdCount: 1, issueCount: 1 }

describe('planner projected occurrences', () => {
  it('maps projected from the occurrence', () => {
    const cards = buildRoundCards({ id: 'r1', name: 'Fri' }, [
      { ...occ, date: '2026-11-13' },
      { ...occ, date: '2026-11-20', projected: true, completedCount: 0 },
    ], null)
    expect(cards.map((c) => c.projected)).toEqual([false, true])
  })

  it('sumKpis ignores projected cards', () => {
    const cards = buildRoundCards({ id: 'r1', name: 'Fri' }, [
      { ...occ, date: '2026-11-13' },
      { ...occ, date: '2026-11-20', projected: true, stopCount: 50, totalValue: 999 },
    ], null)
    expect(sumKpis(cards)).toMatchObject({ stopCount: 4, totalValue: 100, completionPct: 50 })
  })
})
