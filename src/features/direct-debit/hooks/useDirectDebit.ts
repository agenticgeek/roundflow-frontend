import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { directDebitApi, type MandateImportLink } from '@/api/direct-debit.api'
import type { SendChannel } from '@/api/invoices.api'
import { invalidateCustomers, queryKeys } from '@/lib/query-keys'

/** Mandate status and current setup link for one customer. */
export function useDirectDebitStatus(customerId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.customers.directDebit(customerId),
    queryFn: ({ signal }) => directDebitApi.status(customerId, signal),
    enabled: enabled && Boolean(customerId),
  })
}

/** Makes (or reuses) the setup link to copy; refreshes the status so the panel shows it. */
export function useDirectDebitLink(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => directDebitApi.link(customerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.directDebit(customerId) })
    },
  })
}

/** Sends the setup link to the customer on the chosen channel. */
export function useSendDirectDebitLink(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: SendChannel) => directDebitApi.send(customerId, channel),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.directDebit(customerId) })
    },
  })
}

/** Existing GoCardless mandates with suggested customers (ADMIN). Only fetched while the review is open. */
export function useMandateImportCandidates(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.directDebit.importCandidates,
    queryFn: ({ signal }) => directDebitApi.importCandidates(signal),
    enabled,
    staleTime: 0,
  })
}

/** Links the confirmed mandate -> customer pairs, then refreshes customers and the candidate list. */
export function useImportMandates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (links: MandateImportLink[]) => directDebitApi.importMandates(links),
    onSuccess: () => {
      void invalidateCustomers(queryClient)
      void queryClient.invalidateQueries({ queryKey: ['customers', 'direct-debit'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.directDebit.importCandidates })
    },
  })
}
