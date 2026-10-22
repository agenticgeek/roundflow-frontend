import { api } from '@/api/client'
import type { CleaningFrequency, PaymentMethod, ServicePlanView } from '@/api/types'

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
    api<ServicePlanView>(`/service-plans/${id}`, jsonRequest('PATCH', input)),

  pause: (id: string, input: ServicePlanPauseInput) =>
    api<ServicePlanView>(`/service-plans/${id}/pause`, jsonRequest('POST', input)),

  resume: (id: string) =>
    api<ServicePlanView>(`/service-plans/${id}/resume`, jsonRequest('POST')),
}
