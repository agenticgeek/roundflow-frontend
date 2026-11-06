import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'

vi.mock('@/components/app/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('@/hooks/use-app-quick-actions', () => ({ useAppQuickActions: () => ({}) }))
vi.mock('@/components/todays-work/TodaysWorkScreen', () => ({
  TodaysWorkScreen: ({ interactions }: { interactions: { deepLink: unknown; selectedRound: unknown } }) => (
    <p>{`today ${JSON.stringify(interactions.deepLink)}`}</p>
  ),
}))
vi.mock('@/components/round-planner/RoundPlannerScreen', () => ({
  RoundPlannerScreen: ({ interactions }: { interactions: { roundId: string; selectedDate: string; view: string } }) => (
    <p>{`planner ${interactions.roundId} ${interactions.selectedDate} ${interactions.view}`}</p>
  ),
}))

const { default: TodaysWork } = await import('@/pages/TodaysWork')
const { default: RoundPlanner } = await import('@/pages/RoundPlanner')

describe('pages pass the deep link to their screens', () => {
  it("Today's Work", () => {
    renderWithProviders(<TodaysWork />, { route: '/todays-work?round=r1&visitId=v1' })
    expect(screen.getByText('today {"visitId":"v1","round":"r1"}')).toBeInTheDocument()
  })

  it('Round Planner', () => {
    renderWithProviders(<RoundPlanner />, { route: '/round-planner?round=r1&date=2026-11-09' })
    expect(screen.getByText('planner r1 2026-11-09 list')).toBeInTheDocument()
  })
})
