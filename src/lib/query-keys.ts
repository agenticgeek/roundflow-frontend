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
