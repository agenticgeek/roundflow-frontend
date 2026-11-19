import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { RoundPlannerDetailPanel } from '@/components/round-planner/RoundPlannerDetailPanel'
import { TodaysWorkRoundDetailPanel } from '@/components/todays-work/TodaysWorkRoundDetailPanel'
import type { TodaysWorkRound } from '@/content/todays-work'
import type { PlannerRoundCard } from '@/features/rounds/lib/planner'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// One stop per property per day in the office views (docs/PROPERTY_STOPS_PLAN_2026-11-19.md §3.5).

const card: PlannerRoundCard = {
  key: 'r1-2099-01-01',
  roundId: 'r1',
  roundName: 'Alnwick Fri',
  date: '2099-01-01',
  stopCount: 1,
  totalValue: 30,
  completedCount: 1,
  holdCount: 0,
  issueCount: 0,
  status: 'completed',
  technicianName: null,
  projected: false,
}

function mockStop() {
  server.use(
    on('get', '/rounds/{id}/planner/occurrences/{date}', () =>
      HttpResponse.json({
        roundId: 'r1',
        roundName: 'Alnwick Fri',
        date: '2099-01-01',
        stops: [
          {
            visitId: 'v1',
            stopKey: 'p1|2099-01-01|t1',
            propertyId: 'p1',
            addressLine: '1 High St',
            postcode: 'NE66',
            customerName: 'Jane',
            price: 20,
            status: 'COMPLETED',
            paymentHold: false,
            issues: [],
            services: [
              { visitId: 'v1', serviceName: 'Window clean', status: 'COMPLETED', price: 20 },
              { visitId: 'v2', serviceName: 'Gutter clear', status: 'SKIPPED', price: 10 },
            ],
          },
        ],
        summary: { stopCount: 1, totalValue: 30, completedCount: 1, completionPct: 100, holdCount: 0, issueCount: 0 },
      } as never),
    ),
  )
}

describe('Round Planner stop card', () => {
  it('names the services and offers Reschedule for the skipped service only', async () => {
    mockStop()
    let rescheduled: string | undefined
    server.use(
      on('patch', '/visits/{id}/reschedule', ({ params }) => {
        rescheduled = String(params.id)
        return HttpResponse.json({ id: String(params.id), date: '2099-01-08', status: 'SCHEDULED' } as never)
      }),
    )
    const { user } = renderWithProviders(
      <RoundPlannerDetailPanel card={card} currency="GBP" canMutate onClose={vi.fn()} onOpenList={vi.fn()} onOpenMap={vi.fn()} />,
    )
    expect(await screen.findByText('Window clean')).toBeInTheDocument()
    expect(screen.getByText(/Gutter clear/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reschedule Window clean' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reschedule Gutter clear' }))
    expect(await screen.findByText('Reschedule visit')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-08' } })
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    await waitFor(() => expect(rescheduled).toBe('v2'))
  })
})

describe("Today's Work stop card", () => {
  const round: TodaysWorkRound = {
    id: 'r1',
    status: 'in-progress',
    round: 'Alnwick Fri',
    technician: 'Sam',
    technicianId: null,
    technicianInitial: 'S',
    progressCompleted: 0,
    progressTotal: 1,
    completed: 0,
    skipped: 0,
    issues: 0,
    paymentHolds: 0,
    value: '£30.00',
    eta: '—',
    jobs: [
      {
        id: 'v1',
        customer: 'Jane',
        address: '1 High St',
        status: 'scheduled',
        services: 'Window clean + Gutter clear',
        visitIds: ['v1', 'v2'],
      },
    ],
  }

  it('shows the services and assigns every visit in the stop', async () => {
    const assigned: string[] = []
    server.use(
      on('get', '/settings/technicians', () => HttpResponse.json([{ id: 't9', name: 'Kim', active: true, role: 'TECHNICIAN', appStatus: 'ACTIVE' }] as never)),
      on('patch', '/visits/{id}/assign', ({ params }) => {
        assigned.push(String(params.id))
        return HttpResponse.json({ visitId: String(params.id), technicianId: 't9', technicianName: 'Kim' } as never)
      }),
    )
    const { user } = renderWithProviders(<TodaysWorkRoundDetailPanel round={round} onClose={vi.fn()} onReassignTechnician={vi.fn()} />)
    expect(screen.getByText('Window clean + Gutter clear')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Assign this visit' }))
    await user.click(await screen.findByRole('option', { name: 'Kim' }))
    expect(await screen.findByText('Assigned to Kim')).toBeInTheDocument()
    expect(assigned).toEqual(['v1', 'v2'])
  })
})
