import type { ReactNode } from 'react'
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ApiError, errorMessage } from '@/lib/errors'
import { useUiStore } from '@/stores/ui.store'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        error instanceof ApiError
          ? error.status >= 500 && failureCount < 2
          : failureCount < 2,
    },
    mutations: {
      retry: 0,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silenceGlobalError) return
      if (error instanceof ApiError && error.status === 400) return
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return
      }

      useUiStore.getState().pushToast({
        message: errorMessage(error),
        tone: 'error',
      })
    },
  }),
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      ) : null}
    </QueryClientProvider>
  )
}
