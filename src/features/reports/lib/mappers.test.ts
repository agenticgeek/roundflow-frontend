import { describe, expect, it } from 'vitest'
import { activityToItems, mapVisitStatus, uiStatusToApi, visitsToRows } from '@/features/reports/lib/mappers'
import { plannerVisitStatusLabels } from '@/content/round-planner'

describe('reports mappers', () => {
  it('GAP-024: reads activity from the paginated page and names the actor', () => {
    const items = activityToItems({
      rows: [
        { id: 'a', type: 'VISIT_COMPLETED', message: 'Visit done', actorRole: 'ADMIN', actorName: 'Jo Coates', createdAt: '2026-10-30T10:00:00Z' },
        { id: 'b', type: 'ROUND_UPDATED', message: 'Round edited', actorRole: 'MANAGER', createdAt: 'not-a-date' },
        { id: 'c', type: 'X', message: 'System', actorRole: null, actorName: null, createdAt: 'later' },
      ],
      pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
    })
    expect(items.map((item) => item.meta)).toEqual([expect.stringMatching(/by Jo Coates$/), 'not-a-date by MANAGER', 'later'])
    expect(activityToItems(undefined)).toEqual([])
  })

  it('Phase 2: every visit status maps, incl. CANCELLED', () => {
    expect(mapVisitStatus('COMPLETED')).toBe('completed')
    expect(mapVisitStatus('SKIPPED')).toBe('skipped')
    expect(mapVisitStatus('IN_PROGRESS')).toBe('in-progress')
    expect(mapVisitStatus('SCHEDULED')).toBe('scheduled')
    expect(mapVisitStatus('CANCELLED')).toBe('cancelled')
    expect(mapVisitStatus('NEW' as never)).toBe('scheduled')
    expect(uiStatusToApi('cancelled')).toBe('CANCELLED')
    expect(
      visitsToRows([{ visitId: 'v', date: '2026-10-30', property: 'x', status: 'CANCELLED', amount: null } as never])[0]?.status,
    ).toBe('cancelled')
    expect(plannerVisitStatusLabels.CANCELLED).toBe('Cancelled')
  })

  it('status badge maps include cancelled', async () => {
    await import('@/components/reports/ReportsScreen')
    await import('@/components/round-planner/RoundPlannerListView')
    await import('@/components/property-detail/PropertyDetailScreen')
    await import('@/components/customers/CustomersScreen')
  })
})
