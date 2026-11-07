import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { integrationsApi, type OutboxStatus } from '@/api/integrations.api'

export const outboxKeys = {
  all: ['integrations', 'outbox'] as const,
  list: (status: OutboxStatus, page: number) => ['integrations', 'outbox', status, page] as const,
}

/** Failed integration messages, a page at a time. The caller must be an ADMIN. */
export function useOutbox(status: OutboxStatus, page: number) {
  return useQuery({
    queryKey: outboxKeys.list(status, page),
    queryFn: ({ signal }) => integrationsApi.outbox(status, page, signal),
  })
}

/** Re-queues one message. The panel shows the error inside its confirm dialog. */
export function useReplayOutbox() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => integrationsApi.replay(id),
    meta: { silenceGlobalError: true },
    // Also after a 404 / 409: the row is gone or already queued, so the list is stale either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: outboxKeys.all }),
  })
}
