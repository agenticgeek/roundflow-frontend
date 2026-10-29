import { useEffect } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { customersApi } from '@/api/customers.api'
import type {
  CustomerCreateInput,
  CustomerListParams,
  CustomerUpdateInput,
  PropertyCreateInput,
} from '@/api/types'
import {
  invalidateCustomers,
  invalidateRounds,
  queryKeys,
} from '@/lib/query-keys'

/** Customers per page on the Customers screen. */
export const CUSTOMERS_PAGE_SIZE = 5

/** Pages stay fresh this long — flipping back to one already seen doesn't refetch. */
const CUSTOMER_LIST_STALE_TIME = 30_000

function customerListQuery(params: CustomerListParams) {
  return {
    queryKey: queryKeys.customers.list({
      search: params.search,
      roundId: params.roundId,
      status: params.status,
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: ({ signal }: { signal?: AbortSignal }) => customersApi.list(params, signal),
    staleTime: CUSTOMER_LIST_STALE_TIME,
  }
}

/**
 * Loads the Customers screen's first page (no search or filters) ahead of time — e.g. when
 * the sidebar link is hovered — so the screen opens with data already there.
 */
export function prefetchCustomersFirstPage(queryClient: QueryClient) {
  return queryClient.prefetchQuery(customerListQuery({ page: 1, pageSize: CUSTOMERS_PAGE_SIZE }))
}

export function useCustomers(params: CustomerListParams = {}, enabled = true) {
  const queryClient = useQueryClient()
  const query = useQuery({
    ...customerListQuery(params),
    enabled,
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })

  // Load the neighbouring pages in the background so Next / Previous open instantly.
  const pagination = query.data?.pagination
  const currentPage = params.page ?? 1
  const loadedPage = query.isPlaceholderData ? null : pagination?.page
  useEffect(() => {
    if (!enabled || !pagination || loadedPage !== currentPage) return
    for (const neighbour of [currentPage + 1, currentPage - 1]) {
      if (neighbour < 1 || neighbour > pagination.totalPages) continue
      void queryClient.prefetchQuery(customerListQuery({ ...params, page: neighbour }))
    }
    // `params` is rebuilt every render; its fields are what matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    queryClient,
    currentPage,
    loadedPage,
    pagination?.totalPages,
    params.search,
    params.roundId,
    params.status,
    params.pageSize,
  ])

  return query
}

export function useCustomer(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: ({ signal }) => customersApi.get(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerCreateInput) => customersApi.create(input),
    onSuccess: () => invalidateCustomers(queryClient),
  })
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerUpdateInput) => customersApi.update(customerId, input),
    onSuccess: (_data, input) => {
      void invalidateCustomers(queryClient)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customerId),
      })
      if (input.roundId !== undefined) {
        void invalidateRounds(queryClient)
      }
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => invalidateCustomers(queryClient),
  })
}

export function useAddCustomerProperty(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<PropertyCreateInput, 'customerName' | 'phone' | 'email'>,
    ) => customersApi.addProperty(customerId, input),
    onSuccess: (data) => {
      void invalidateCustomers(queryClient)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customerId),
      })
      if (data.assigned) {
        void invalidateRounds(queryClient)
      }
    },
  })
}
