import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CUSTOMER_VISITS_PAGE_SIZE, customerRecordsApi, type BadDebtInput } from '@/api/customer-records.api'
import { invalidateCustomers, invalidateDebt, queryKeys } from '@/lib/query-keys'

/** GET /customers/:id/visits — Visit History incl. cancelled visits (GAP-020). */
export function useCustomerVisits(customerId: string, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.visits(customerId, page),
    queryFn: ({ signal }) =>
      customerRecordsApi.visits(customerId, { page, pageSize: CUSTOMER_VISITS_PAGE_SIZE }, signal),
    enabled: enabled && Boolean(customerId),
    placeholderData: keepPreviousData,
  })
}

/** PATCH /customers/:id/bad-debt — the header badge and the debt board both change (GAP-022). */
export function useSetBadDebt(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BadDebtInput) => customerRecordsApi.setBadDebt(customerId, input),
    meta: { silenceGlobalError: true },
    onSuccess: () => Promise.all([invalidateCustomers(queryClient), invalidateDebt(queryClient)]),
  })
}
