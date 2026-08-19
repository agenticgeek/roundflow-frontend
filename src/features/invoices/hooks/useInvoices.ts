import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  invoicesApi,
  type InvoiceCreateInput,
} from '@/api/invoices.api'
import {
  invalidateCustomers,
  invalidateDebt,
  invalidateInvoices,
  queryKeys,
} from '@/lib/query-keys'

export function useInvoicePreview(visitId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.preview(visitId),
    queryFn: ({ signal }) => invoicesApi.preview(visitId, signal),
    enabled: enabled && Boolean(visitId),
    retry: false,
  })
}

export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: ({ signal }) => invoicesApi.get(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useCustomerInvoices(customerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.byCustomer(customerId),
    queryFn: ({ signal }) => invoicesApi.listByCustomer(customerId, signal),
    enabled: enabled && Boolean(customerId),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoiceCreateInput) => invoicesApi.create(input),
    onSuccess: (_data, input) => {
      void invalidateInvoices(queryClient)
      void invalidateCustomers(queryClient)
      void invalidateDebt(queryClient)
      void queryClient.removeQueries({
        queryKey: queryKeys.invoices.preview(input.visitId),
      })
    },
  })
}

export function useSendInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.send(id),
    onSuccess: (_data, id) => {
      void invalidateInvoices(queryClient)
      void invalidateCustomers(queryClient)
      void invalidateDebt(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) })
    },
  })
}
