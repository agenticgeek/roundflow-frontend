import { describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { TodayAggregate } from '@/api/today.api'
import { TodaysWorkScreen } from '@/components/todays-work/TodaysWorkScreen'
import { useDeepLink } from '@/hooks/use-deep-link'
import { useTodaysWorkInteractions } from '@/hooks/use-todays-work-interactions'
import { server } from '@/test/msw/server'
import { API, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const round = {
  roundId: 'r1',
  roundName: 'Alnwick Fri',
  technicianId: 't1',
  technicianName: 'Sam',
  status: 'in_progress' as const,
  total: 2,
  completed: 0,
  skipped: 0,
  issueCount: 0,
  paymentHolds: 0,
  scheduledValue: 80,
  completedValue: 0,
  value: 0,
  etaMinutes: null,
}

const aggregate: TodayAggregate = {
  date: '2026-11-05',
  generatedAt: '2026-11-05T09:41:00',
  dayClosed: false,
  kpi: { totalStops: 2, inProgress: 1, completed: 0, skipped: 0, issues: 0, paymentHolds: 0, carriedOver: 0, valueCompleted: 0 },
  rounds: [round],
  technicians: [],
}

const stops = [
  { visitId: 'v1', customerName: 'Jo Coates', addressLine: '1 High St', status: 'SCHEDULED', paymentHold: false, hasIssue: false, issueFlag: null },
  {
    visitId: 'v2',
    customerName: 'Ann Bell',
    addressLine: '2 High St',
    status: 'SCHEDULED',
    paymentHold: false,
    hasIssue: false,
    issueFlag: null,
    carriedOver: true,
    carriedOverFromDate: '2026-11-04',
    locationApproximate: true,
  },
]

function Screen() {
  return <TodaysWorkScreen interactions={useTodaysWorkInteractions(useDeepLink())} />
}

function renderAt(url: string) {
  server.use(
    on('get', '/today', () => specJson('/today', 'get', 200, aggregate)),
    http.get(`${API}/rounds/r1/today`, () =>
      HttpResponse.json({
        roundId: 'r1',
        roundName: 'Alnwick Fri',
        technicianId: 't1',
        technicianName: 'Sam',
        status: 'in_progress',
        progress: { total: 2, completed: 0, skipped: 0, issues: 0 },
        stops,
      }),
    ),
  )
  return renderWithProviders(<Screen />, { route: url })
}

describe("Today's Work deep links", () => {
  it('opens the linked round and focuses the linked visit', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    renderAt('/todays-work?round=r1&visitId=v2')
    const visit = (await screen.findByText('Ann Bell', undefined, { timeout: 8000 })).closest('li')!
    await waitFor(() => expect(visit).toHaveFocus(), { timeout: 5000 })
    expect(visit).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('Jo Coates').closest('li')).not.toHaveAttribute('aria-current')
    // The carried-over visit says where it came from.
    expect(screen.getByText('Carried over from Wed 4 Nov')).toBeInTheDocument()
  })

  it('opens no round without a link', async () => {
    renderAt('/todays-work')
    await screen.findByText('Alnwick Fri')
    expect(screen.queryByText('Jo Coates')).not.toBeInTheDocument()
  })

  it('points at the Round Planner when the link is for another day', async () => {
    renderAt('/todays-work?round=r1&visitId=v1&date=2026-11-09')
    const notice = await screen.findByRole('status', undefined, { timeout: 5000 })
    expect(notice).toHaveTextContent('This link is for Mon 9 Nov')
    expect(screen.getByRole('link', { name: 'Open that day in Round Planner' })).toHaveAttribute(
      'href',
      '/round-planner?visitId=v1&round=r1&date=2026-11-09',
    )
  })

  it('says nothing when the linked day is today', async () => {
    renderAt('/todays-work?date=2026-11-05')
    await screen.findByText('Alnwick Fri')
    expect(screen.queryByText(/This link is for/)).not.toBeInTheDocument()
  })
})

describe('useDeepLink outside providers', () => {
  it('renders in a bare router', () => {
    function Probe() {
      return <p>{JSON.stringify(useDeepLink())}</p>
    }
    render(
      <MemoryRouter initialEntries={['/x?round=r9']}>
        <Probe />
      </MemoryRouter>,
    )
    expect(screen.getByText('{"round":"r9"}')).toBeInTheDocument()
  })
})
