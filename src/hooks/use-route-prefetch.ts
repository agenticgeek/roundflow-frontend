import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ROUTES } from '@/config/routes'
import { prefetchCustomersFirstPage } from '@/features/customers/hooks/useCustomers'

/**
 * Each page's code chunk — the same `import()` the router's `lazy()` uses, so calling it
 * early means the chunk is already downloaded when the route renders.
 */
const PAGE_CHUNKS: Partial<Record<string, () => Promise<unknown>>> = {
  [ROUTES.dashboard]: () => import('@/pages/Dashboard'),
  [ROUTES.roundPlanner]: () => import('@/pages/RoundPlanner'),
  [ROUTES.todaysWork]: () => import('@/pages/TodaysWork'),
  [ROUTES.customers]: () => import('@/pages/Customers'),
  [ROUTES.debtPayment]: () => import('@/pages/DebtPayment'),
  [ROUTES.reportsHistory]: () => import('@/pages/Reports'),
  [ROUTES.complaints]: () => import('@/pages/Complaints'),
  [ROUTES.settings]: () => import('@/pages/Settings'),
  [ROUTES.technicians]: () => import('@/pages/Technicians'),
}

/**
 * Warms a route before it's opened (hover / focus on its link): downloads the page's code
 * and, where it's known up front, its first data request — instead of loading the code first
 * and only then starting the data request once the page renders.
 */
export function useRoutePrefetch() {
  const queryClient = useQueryClient()
  return useCallback(
    (route: string) => {
      void PAGE_CHUNKS[route]?.().catch(() => undefined)
      if (route === ROUTES.customers) void prefetchCustomersFirstPage(queryClient)
    },
    [queryClient],
  )
}
