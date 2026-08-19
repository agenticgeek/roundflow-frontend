import { api } from '@/api/client'

/** CONTRACT-DIFF: `/today` aggregate not in generated OpenAPI yet — live per TODAY_HANDOFF. */

export type TodayRoundStatus = 'not_started' | 'in_progress' | 'completed'

export type TodayKpi = {
  totalStops: number
  inProgress: number
  completed: number
  skipped: number
  issues: number
  paymentHolds: number
  valueCompleted: number
}

export type TodayRoundSummary = {
  roundId: string
  roundName: string
  technicianId: string | null
  technicianName: string | null
  status: TodayRoundStatus
  total: number
  completed: number
  skipped: number
  issueCount: number
  paymentHolds: number
  value: number
  etaMinutes: number | null
}

export type TodayTechnicianWorkload = {
  technicianId: string
  technicianName: string
  completed: number
  remaining: number
  roundName: string | null
  issueCount: number
  onTrack: boolean
}

export type TodayAggregate = {
  date: string
  dayClosed: boolean
  kpi: TodayKpi
  rounds: TodayRoundSummary[]
  technicians: TodayTechnicianWorkload[]
}

export type CloseDayUnfinishedAction = 'push_to_tomorrow' | 'mark_as_skipped'

export type CloseDayInput = {
  unfinishedAction: CloseDayUnfinishedAction
}

export type CloseDayResult = {
  completedJobs: number
  skippedJobs: number
  outstanding: number
  issues: number
  paymentHolds: number
  revenue: number
}

function jsonRequest(method: 'POST', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const todayApi = {
  get: (signal?: AbortSignal) => api<TodayAggregate>('/today', { signal }),

  close: (input: CloseDayInput) =>
    api<CloseDayResult>('/today/close', jsonRequest('POST', input)),
}
