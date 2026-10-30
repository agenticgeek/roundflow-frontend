import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { DashboardTechnicianKpi } from '@/api/dashboard.api'
import { roundsToRows } from '@/features/dashboard/lib/mappers'
import { kpiAlertsToRows } from '@/features/dashboard/lib/kpi-alerts'
import {
  formatMinutes,
  technicianKpisToTiles,
  totalTimeOnJob,
  weightedRevenuePerHour,
} from '@/features/dashboard/lib/technician-kpis'
import { KpiAlertsPanel } from '@/components/dashboard/KpiAlertsPanel'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

vi.mock('@/components/dashboard/GpsTrackingPanel', () => ({ GpsTrackingPanel: () => null }))
vi.mock('@/components/setup-wizard/WorkspaceSetupCard', () => ({ WorkspaceSetupCard: () => null }))
vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRoundsOccurrenceDay: () => ({ byRoundId: new Map(), isLoading: false }),
}))

const { DashboardScreen } = await import('@/components/dashboard/DashboardScreen')
const { useDashboardInteractions } = await import('@/hooks/use-dashboard-interactions')

function kpi(overrides: Partial<DashboardTechnicianKpi> = {}): DashboardTechnicianKpi {
  return {
    technicianId: 't1',
    technicianName: 'Sam Smith',
    jobsCompleted: 10,
    valueCompleted: 200,
    openComplaints: 0,
    issueCount: 0,
    timeOnJobMinutes: 120,
    revenuePerHour: 100,
    strikes: 2,
    damages: 0,
    upsells: 1,
    upsellValue: 12.5,
    ...overrides,
  }
}

const alertBody = {
  type: 'KPI_THRESHOLD' as const,
  id: 'a1',
  technicianId: 't1',
  technicianName: 'Sam Smith',
  metric: 'strikes',
  value: 4,
  threshold: 3,
  operator: 'GT' as const,
  periodKey: '2026-10',
  createdAt: '2026-10-30T02:00:00Z',
}

describe('technician KPI tiles (GAP-025)', () => {
  it('formats minutes', () => {
    expect(formatMinutes(40)).toBe('40m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(95.4)).toBe('1h 35m')
  })

  it('totals time on job and weights revenue per hour by it; null without timed visits', () => {
    const rows = [kpi(), kpi({ technicianId: 't2', timeOnJobMinutes: 60, revenuePerHour: 40 })]
    expect(totalTimeOnJob(rows)).toBe(180)
    expect(weightedRevenuePerHour(rows)).toBe(80)
    const untimed = [kpi({ timeOnJobMinutes: null, revenuePerHour: null }), kpi({ timeOnJobMinutes: 0, revenuePerHour: 5 })]
    expect(totalTimeOnJob([untimed[0]!])).toBeNull()
    expect(weightedRevenuePerHour(untimed)).toBeNull()
    expect(weightedRevenuePerHour([kpi({ timeOnJobMinutes: undefined })])).toBeNull()
  })

  it('shows "—" before load and computed values after, never "Coming in a later phase"', () => {
    const empty = technicianKpisToTiles(undefined, new Set())
    expect(empty).toHaveLength(9)
    expect(empty.every((tile) => tile.value === '—' && tile.detail === '')).toBe(true)

    const rows = [kpi(), kpi({ technicianId: 't2', technicianName: null, strikes: undefined, damages: 1, upsells: undefined, upsellValue: undefined, openComplaints: 2, issueCount: 1 })]
    const all = technicianKpisToTiles(rows, new Set())
    expect(Object.fromEntries(all.map((tile) => [tile.label, tile.value]))).toEqual({
      'Jobs Completed': '20',
      'Value Completed': '£400',
      'Open Complaints': '2',
      'Issues Raised': '1',
      'Time on Job': '4h',
      'Revenue / Hour': '£100',
      Strikes: '2',
      Damages: '1',
      Upsells: '1',
    })
    expect(all[0]!.detail).toBe('All technicians')
    expect(all[8]!.detail).toBe('£12.50 upsold')
    expect(all[8]!.tone).toBe('success')

    const one = technicianKpisToTiles(rows, new Set(['t2']))
    expect(one[0]!.detail).toBe('')
    const untimed = technicianKpisToTiles([kpi({ timeOnJobMinutes: null, revenuePerHour: null, upsellValue: 0, strikes: 0 })], new Set(['t1']))
    expect(untimed[4]).toMatchObject({ value: '—', detail: 'No timed visits in this period' })
    expect(untimed[5]).toMatchObject({ value: '—', tone: 'default' })
    expect(untimed[6]).toMatchObject({ value: '0', detail: 'All clear', tone: 'success' })
    expect(untimed[8]!.tone).toBe('default')
    expect(technicianKpisToTiles([kpi()], new Set(['t1']))[0]!.detail).toBe('All technicians')
  })
})

describe('KPI threshold alerts (GAP-025)', () => {
  it('maps kpiAlerts to lines that link to the technician', () => {
    expect(kpiAlertsToRows(undefined)).toEqual([])
    expect(
      kpiAlertsToRows({
        skippedNeedingReview: 0,
        failedPayments: 0,
        complaintRevisitsDue: 0,
        kpiAlerts: [
          alertBody,
          { ...alertBody, id: 'a2', technicianName: null, metric: 'revenuePerHour', value: 12, threshold: 20, operator: 'LT' },
          { ...alertBody, id: 'a3', metric: 'newMetric', operator: 'EQ' as never },
        ],
      }),
    ).toEqual([
      { id: 'a1', technicianName: 'Sam Smith', line: 'Strikes 4, above the 3 threshold', to: '/technicians/t1' },
      { id: 'a2', technicianName: 'Technician', line: 'Revenue per hour £12.00, below the £20.00 threshold', to: '/technicians/t1' },
      { id: 'a3', technicianName: 'Sam Smith', line: 'newMetric 4, EQ the 3 threshold', to: '/technicians/t1' },
    ])
  })

  it('panel is hidden with no alerts', () => {
    const { container } = renderWithProviders(<KpiAlertsPanel rows={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('dashboard rounds (GAP-035)', () => {
  it('uses scheduledValue, falling back to the deprecated value', () => {
    const base = { roundId: 'r1', roundName: 'Alnwick', status: 'completed' as const, total: 3, completed: 3, skipped: 0, issueCount: 0, paymentHolds: 0, value: 20 }
    expect(roundsToRows([{ ...base, scheduledValue: 60 }])[0]!.value).toBe('£60')
    expect(roundsToRows([base])[0]!.value).toBe('£20')
  })
})

describe('DashboardScreen', () => {
  function Screen() {
    return <DashboardScreen interactions={useDashboardInteractions()} onOpenAlert={vi.fn()} onViewAllRounds={vi.fn()} />
  }

  it('shows computed KPIs, KPI alerts, the revenue-per-hour figure and no ETA column', async () => {
    server.use(
      on('get', '/dashboard/kpis', () =>
        specJson('/dashboard/kpis', 'get', 200, {
          jobsScheduledToday: 3, openComplaints: 0, openComplaintsByPriority: { high: 0, medium: 0, low: 0 },
          cleanUnpaidAmount: 0, cleanUnpaidCount: 0, monthlyRevenue: 100,
        }),
      ),
      on('get', '/dashboard/alerts', () =>
        specJson('/dashboard/alerts', 'get', 200, { skippedNeedingReview: 0, failedPayments: 0, complaintRevisitsDue: 0, kpiAlerts: [alertBody] }),
      ),
      on('get', '/dashboard/rounds', () =>
        specJson('/dashboard/rounds', 'get', 200, [
          { roundId: 'r1', roundName: 'Alnwick Fri', status: 'completed', total: 2, completed: 2, skipped: 0, issueCount: 0, paymentHolds: 0, scheduledValue: 40, completedValue: 40, value: 40, etaMinutes: null },
        ]),
      ),
      on('get', '/dashboard/technician-kpis', () =>
        specJson('/dashboard/technician-kpis', 'get', 200, [kpi(), kpi({ technicianId: 't2', technicianName: null })]),
      ),
      on('get', '/dashboard/charts', () =>
        specJson('/dashboard/charts', 'get', 200, { months: ['Oct'], valueCompleted: [400], issueCount: [0], revenuePerHour: 33.5 }),
      ),
    )
    renderWithProviders(<Screen />)

    expect(await screen.findByText('KPI alerts')).toBeInTheDocument()
    expect(screen.getByText(/Strikes 4, above the 3 threshold/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View technician' })).toHaveAttribute('href', '/technicians/t1')
    expect(await screen.findByText('£33.50 per hour across completed, timed visits in this range.')).toBeInTheDocument()
    expect(await screen.findByText('Revenue / Hour')).toBeInTheDocument()
    expect(screen.queryByText('Coming in a later phase')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^—/ })).toBeInTheDocument()

    const roundRow = (await screen.findByText('Alnwick Fri')).closest('tr')!
    expect(within(roundRow).getByText('Completed')).toBeInTheDocument()
    expect(within(roundRow).getByText('£40')).toBeInTheDocument()
    expect(screen.queryByText('ETA')).not.toBeInTheDocument()
  })

  it('explains a missing revenue per hour', async () => {
    server.use(
      on('get', '/dashboard/kpis', () =>
        specJson('/dashboard/kpis', 'get', 200, {
          jobsScheduledToday: 0, openComplaints: 0, openComplaintsByPriority: { high: 0, medium: 0, low: 0 },
          cleanUnpaidAmount: 0, cleanUnpaidCount: 0, monthlyRevenue: 0,
        }),
      ),
      on('get', '/dashboard/alerts', () =>
        specJson('/dashboard/alerts', 'get', 200, { skippedNeedingReview: 0, failedPayments: 0, complaintRevisitsDue: 0, kpiAlerts: [] }),
      ),
      on('get', '/dashboard/rounds', () => specJson('/dashboard/rounds', 'get', 200, [])),
      on('get', '/dashboard/technician-kpis', () => specJson('/dashboard/technician-kpis', 'get', 200, [])),
      on('get', '/dashboard/charts', () =>
        specJson('/dashboard/charts', 'get', 200, { months: [], valueCompleted: [], issueCount: [], revenuePerHour: null }),
      ),
    )
    renderWithProviders(<Screen />)
    expect(await screen.findByText(/No timed visits in this range yet/)).toBeInTheDocument()
    expect(screen.queryByText('KPI alerts')).not.toBeInTheDocument()
  })
})
