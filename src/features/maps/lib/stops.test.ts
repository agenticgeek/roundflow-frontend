import { describe, expect, it } from 'vitest'
import type { PlannerDayResult, PlannerStop } from '@/api/rounds.api'
import { filterPlannerStops, stopsForDates, weekDates } from '@/features/maps/lib/stops'
import type { PlannerListStop } from '@/features/rounds/lib/planner'

function plannerStop(overrides: Partial<PlannerStop> = {}): PlannerStop {
  return {
    visitId: 'v1',
    propertyId: 'p1',
    addressLine: '4 Hotspur Street',
    postcode: 'NE66 1TD',
    customerName: 'Jo Coates',
    price: 20,
    status: 'SCHEDULED',
    paymentHold: false,
    issues: [],
    ...overrides,
  }
}

function day(roundId: string, roundName: string, stops: PlannerStop[]): PlannerDayResult {
  return {
    roundId,
    roundName,
    date: '2026-11-02',
    stops,
    summary: { stopCount: stops.length, totalValue: 0, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0 },
  }
}

describe('weekDates', () => {
  it('returns Monday to Sunday of the week', () => {
    expect(weekDates('2026-11-05')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ])
  })
})

describe('stopsForDates', () => {
  it('flattens days in date order and labels each stop with its round', () => {
    const byDate = new Map([
      ['2026-11-02', new Map([['r1', day('r1', '', [plannerStop({ visitId: 'a' })])]])],
      ['2026-11-03', new Map([['r1', day('r1', 'Fri round', [plannerStop({ visitId: 'b' })])]])],
    ])
    const stops = stopsForDates(byDate, ['2026-11-02', '2026-11-03', '2026-11-04'], [
      { id: 'r1', name: 'Round one' },
      { id: 'r2', name: 'Round two' },
    ])
    expect(stops.map((item) => [item.visitId, item.roundName])).toEqual([
      ['a', 'Round one'],
      ['b', 'Fri round'],
    ])
  })
})

describe('filterPlannerStops', () => {
  const stops: PlannerListStop[] = [
    { ...plannerStop({ visitId: 'a', technicianId: 't1', status: 'COMPLETED' }), roundId: 'r1', roundName: 'Alnwick' },
    { ...plannerStop({ visitId: 'b', technicianId: 't2', propertyName: 'The Barn' }), roundId: 'r1', roundName: 'Alnwick' },
  ]

  it('applies technician, status and search filters', () => {
    expect(filterPlannerStops(stops, { technicianId: 'all', statusId: 'all', query: '' })).toHaveLength(2)
    expect(filterPlannerStops(stops, { technicianId: 't1', statusId: 'all', query: '' }).map((s) => s.visitId)).toEqual(['a'])
    expect(filterPlannerStops(stops, { technicianId: 'all', statusId: 'completed', query: '' }).map((s) => s.visitId)).toEqual(['a'])
    expect(filterPlannerStops(stops, { technicianId: 'all', statusId: 'all', query: 'barn' }).map((s) => s.visitId)).toEqual(['b'])
    expect(filterPlannerStops(stops, { technicianId: 'all', statusId: 'all', query: 'nowhere' })).toEqual([])
  })
})
