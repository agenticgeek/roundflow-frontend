import { api } from '@/api/client'
import type { PauseResult, ServicePlan } from '@/api/properties.api'
import type { components } from '@/api/types.gen'
import type { CleaningFrequency, PaymentMethod } from '@/api/types'

/** PATCH /service-plans/:id → `{ servicePlan, movedToRound }` (BREAKING, B3 · GAP-018). */
export type PlanUpdateResult = components['schemas']['PlanUpdateResult']

/**
 * Per-plan writes (audit follow-up 2026-10-22). On a property with several plans, the
 * property/customer endpoints change whichever plan the backend treats as primary — these
 * target one plan by id instead.
 */
export type ServicePlanUpdateInput = {
  price?: number
  cleanMethod?: string
  paymentMethod?: PaymentMethod
  cleaningFrequency?: CleaningFrequency
  /** Create the proposed round instead of answering 409 NO_MATCHING_ROUND. */
  createRoundIfMissing?: boolean
}

export type ServicePlanPauseInput = {
  reason: string
  /** `YYYY-MM-DD` */
  pauseStartDate: string
  /** `YYYY-MM-DD`; omit to pause until resumed. */
  pauseEndDate?: string
}

function jsonRequest(method: 'POST' | 'PATCH', body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

export const servicePlansApi = {
  update: (id: string, input: ServicePlanUpdateInput) =>
    api<PlanUpdateResult>(`/service-plans/${id}`, jsonRequest('PATCH', input)),

  pause: (id: string, input: ServicePlanPauseInput) =>
    api<PauseResult>(`/service-plans/${id}/pause`, jsonRequest('POST', input)),

  resume: (id: string) =>
    api<ServicePlan>(`/service-plans/${id}/resume`, jsonRequest('POST')),
}
