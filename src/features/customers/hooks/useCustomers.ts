import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useCustomers(params: CustomerListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.list({
      search: params.search,
      roundId: params.roundId,
      status: params.status,
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: ({ signal }) => customersApi.list(params, signal),
    enabled,
  })
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
