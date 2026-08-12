import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  setup: {
    all: ['setup'] as const,
    status: ['setup', 'status'] as const,
    step: (n: number) => ['setup', 'step', n] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters: Record<string, string | number | undefined>) =>
      ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  properties: {
    all: ['properties'] as const,
    notes: (id: string) => ['properties', 'notes', id] as const,
  },
  rounds: {
    all: ['rounds'] as const,
    list: (status?: string) => ['rounds', 'list', status ?? 'ALL'] as const,
    detail: (id: string) => ['rounds', 'detail', id] as const,
    occurrences: (id: string, from?: string, to?: string) =>
      ['rounds', 'occurrences', id, from ?? '', to ?? ''] as const,
    occurrenceDay: (id: string, date: string) =>
      ['rounds', 'occurrence-day', id, date] as const,
  },
  settings: {
    all: ['settings'] as const,
    businessProfile: ['settings', 'business-profile'] as const,
    roundSettings: ['settings', 'round-settings'] as const,
    payment: ['settings', 'payment'] as const,
    services: ['settings', 'services'] as const,
    serviceAreas: ['settings', 'service-areas'] as const,
    technicians: ['settings', 'technicians'] as const,
    messageTemplates: ['settings', 'message-templates'] as const,
  },
} as const

export function invalidateBusinessSettings(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.businessProfile }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.roundSettings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.payment }),
  ])
}

export function invalidateCustomers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
}

export function invalidateRounds(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all })
}
