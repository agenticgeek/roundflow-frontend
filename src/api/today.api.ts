import { api } from '@/api/client'

import type { components } from '@/api/types.gen'

type Schemas = components['schemas']

export type TodayRoundStatus = Schemas['TodayRoundRow']['status']
export type TodayKpi = Schemas['TodayKpi']
/** A round row. `scheduledValue` / `completedValue` replace the deprecated `value` (GAP-035). */
export type TodayRoundSummary = Schemas['TodayRoundRow']
export type TodayTechnicianWorkload = Schemas['TodayTechnicianCard']
/** GET /today — `generatedAt` drives "Updated HH:mm" (GAP-035). */
export type TodayAggregate = Schemas['TodaysWorkAggregate']

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
