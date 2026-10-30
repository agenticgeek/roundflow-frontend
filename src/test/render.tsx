import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'

/** A QueryClient for one test: no retries, no cache sharing between tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export type ProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  /** Initial URL, e.g. `/settings?stripe=connected`. */
  route?: string
  /** Route pattern for `useParams`, e.g. `/properties/:propertyId`. */
  path?: string
  queryClient?: QueryClient
}

/**
 * Renders inside the app's providers — QueryClient (`retry: false`), the toast provider and a
 * MemoryRouter. `useAppBootstrap()` is mocked globally (see `src/test/bootstrap.ts`).
 */
export function renderWithProviders(ui: ReactElement, options: ProvidersOptions = {}) {
  const { route = '/', path, queryClient = createTestQueryClient(), ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            {path ? (
              <Routes>
                <Route path={path} element={children} />
              </Routes>
            ) : (
              children
            )}
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}
