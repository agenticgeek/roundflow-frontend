import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closuresApi } from '@/api/closures.api'
import type { ApiError } from '@/lib/errors'
import { newIdempotencyKey } from '@/lib/idempotency'
import { invalidateClosures, invalidateRounds, invalidateToday, queryKeys } from '@/lib/query-keys'
import type {
  Closure,
  ClosureApplyInput,
  ClosureApplyPreview,
  ClosureApplyResult,
  ClosureCreateInput,
  ClosureListResult,
  ClosureUpdateInput,
  IsoDate,
} from '@/features/closures/types'

/** A closure change moves what the planner forecasts and what Today's Work shows. */
function invalidateAfterClosureChange(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    invalidateClosures(queryClient),
    // Planner occurrences live under the rounds keys.
    invalidateRounds(queryClient),
    invalidateToday(queryClient),
  ])
}

export function useClosures(params?: { from?: IsoDate; to?: IsoDate }, enabled = true) {
  return useQuery<ClosureListResult, ApiError>({
    queryKey: queryKeys.closures.list(params),
    queryFn: ({ signal }) => closuresApi.list(params, signal),
    enabled,
  })
}

export function useCreateClosure() {
  const queryClient = useQueryClient()
  return useMutation<Closure, ApiError, ClosureCreateInput>({
    mutationFn: (input) => closuresApi.create(input),
    onSuccess: () => invalidateAfterClosureChange(queryClient),
  })
}

export function useUpdateClosure() {
  const queryClient = useQueryClient()
  return useMutation<Closure, ApiError, { id: string; input: ClosureUpdateInput }>({
    mutationFn: ({ id, input }) => closuresApi.update(id, input),
    onSuccess: () => invalidateAfterClosureChange(queryClient),
  })
}

export function useDeleteClosure() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => closuresApi.remove(id),
    onSuccess: () => invalidateAfterClosureChange(queryClient),
  })
}

/** A POST that writes nothing, so it is a mutation; it invalidates nothing. */
export function useClosureApplyPreview() {
  return useMutation<ClosureApplyPreview, ApiError, string>({
    mutationFn: (id) => closuresApi.previewApply(id),
  })
}

/**
 * One idempotency key per user attempt: a retry of the same closure with the same input re-sends the same key,
 * so the server applies it once. The key is dropped after a success, so the next attempt gets a fresh one.
 */
export function useApplyClosure() {
  const queryClient = useQueryClient()
  const attempt = useRef<{ signature: string; key: string } | null>(null)
  return useMutation<ClosureApplyResult, ApiError, { id: string; input?: ClosureApplyInput }>({
    mutationFn: ({ id, input }) => {
      const signature = `${id}|${JSON.stringify(input ?? {})}`
      if (attempt.current?.signature !== signature) attempt.current = { signature, key: newIdempotencyKey() }
      return closuresApi.apply(id, input, attempt.current.key)
    },
    onSuccess: () => {
      attempt.current = null
      return invalidateAfterClosureChange(queryClient)
    },
  })
}
