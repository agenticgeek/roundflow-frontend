import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { appErrorsContent } from '@/content/app-errors'
import { friendlyApiMessage, isAdminOnly } from '@/lib/api-error-copy'
import { ApiError, errorMessage } from '@/lib/errors'
import { isNetworkError } from '@/lib/network-error'
import { handleSessionExpired } from '@/lib/session-expiry'
import { useUiStore } from '@/stores/ui.store'

/** Queries are GETs: retry twice on a network failure or a 5xx, never on a 4xx. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500 && failureCount < 2
  return failureCount < 2
}

/** Exponential backoff between those retries: 1 s, 2 s, … capped at 8 s. */
export function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000)
}

/** One "Can't reach RoundFlow" toast at a time, with a Retry button (GAP-005). */
export function notifyNetworkError(retry: () => void) {
  const copy = appErrorsContent.network
  useUiStore.getState().pushToast({
    key: 'network-error',
    message: copy.message,
    description: copy.description,
    tone: 'error',
    durationMs: 10_000,
    action: { label: copy.retry, onClick: retry },
  })
}

/**
 * The app's QueryClient. Error-display rule: an API error shows the server's message
 * (`ApiError.message`); only a network failure gets the generic message, with Retry.
 */
export function createAppQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay,
      },
      mutations: {
        retry: 0,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        // Screens render their own query error states; only a dead connection gets a toast.
        if (!isNetworkError(error)) return
        notifyNetworkError(() => {
          void client.refetchQueries({ type: 'active', predicate: (query) => query.state.status === 'error' })
        })
      },
    }),
    mutationCache: new MutationCache({
      onError: (mutationError, variables, _context, mutation) => {
        const error: unknown = mutationError
        if (isNetworkError(error)) {
          notifyNetworkError(() => void mutation.execute(variables))
          return
        }
        if (mutation.meta?.silenceGlobalError) return
        if (error instanceof ApiError) {
          // The API client already refreshed and retried; a 401 here means the session is gone (WEB-01).
          if (error.status === 401) {
            void handleSessionExpired()
            return
          }
          // 400s are shown inline by the form that sent them.
          if (error.status === 400) return
          if (error.status === 403) {
            const copy = appErrorsContent.session
            // ADMIN_ONLY: a manager reached an administrator-only action. Say so plainly (no retry helps).
            const adminOnly = isAdminOnly(error) ? friendlyApiMessage(error) : null
            useUiStore.getState().pushToast({
              key: 'forbidden',
              message: adminOnly ?? copy.forbidden,
              description: !adminOnly && error.message !== copy.forbidden ? error.message : undefined,
              tone: 'error',
            })
            return
          }
        }
        useUiStore.getState().pushToast({ message: errorMessage(error), tone: 'error' })
      },
    }),
  })
  return client
}
