import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { floApi } from '@/api/flo.api'
import { floKeys } from '@/features/flo/hooks/useFloStatus'

/** GET /flo/conversations: the caller's own conversations, newest first. Only fetched while the drawer is open. */
export function useFloConversations(enabled: boolean) {
  return useQuery({
    queryKey: floKeys.conversations,
    queryFn: ({ signal }) => floApi.conversations(signal),
    enabled,
    retry: false,
    staleTime: 0,
  })
}

/** DELETE /flo/conversations/:id, then refreshes the list. The caller shows the failure inside its confirm dialog. */
export function useDeleteFloConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => floApi.deleteConversation(id),
    meta: { silenceGlobalError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: floKeys.conversations }),
  })
}
