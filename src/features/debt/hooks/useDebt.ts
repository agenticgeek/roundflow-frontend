import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  debtApi,
  type DebtBoardParams,
  type DebtBucket,
  type DebtPaymentLinkInput,
  type DebtPaymentMethodParam,
  type DebtRemindInput,
} from '@/api/debt.api'
import { invalidateDebt, queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { DEBT_BUCKETS } from '@/features/debt/lib/mappers'

function useDebtEnabled(enabled = true) {
  const { canMutate } = useAppBootstrap()
  return enabled && canMutate
}

export function useDebtKpis(enabled = true) {
  return useQuery({
    queryKey: queryKeys.debt.kpis,
    queryFn: ({ signal }) => debtApi.kpis(signal),
    enabled: useDebtEnabled(enabled),
  })
}

export function useDebtBoard(params: DebtBoardParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.debt.board(
      params.bucket,
      params.roundId,
      params.paymentMethod,
    ),
    queryFn: ({ signal }) => debtApi.board(params, signal),
    enabled: useDebtEnabled(enabled) && Boolean(params.bucket),
  })
}

/** Prefetch all bucket lengths for tab badges (shares cache with useDebtBoard). */
export function useDebtBoardCounts(
  filters: { roundId?: string; paymentMethod?: DebtPaymentMethodParam },
  enabled = true,
) {
  const canLoad = useDebtEnabled(enabled)
  return useQueries({
    queries: DEBT_BUCKETS.map((bucket) => ({
      queryKey: queryKeys.debt.board(bucket, filters.roundId, filters.paymentMethod),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        debtApi.board(
          {
            bucket,
            roundId: filters.roundId,
            paymentMethod: filters.paymentMethod,
          },
          signal,
        ),
      enabled: canLoad,
      select: (rows: Awaited<ReturnType<typeof debtApi.board>>) => rows.length,
    })),
  })
}

export function useDebtRemind() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      input,
    }: {
      invoiceId: string
      input: DebtRemindInput
    }) => debtApi.remind(invoiceId, input),
    onSuccess: () => invalidateDebt(queryClient),
  })
}

export function useDebtPaymentLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      input,
    }: {
      invoiceId: string
      input: DebtPaymentLinkInput
    }) => debtApi.paymentLink(invoiceId, input),
    onSuccess: () => invalidateDebt(queryClient),
  })
}

export function useDebtSetBadDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, flag }: { invoiceId: string; flag: boolean }) =>
      debtApi.setBadDebt(invoiceId, flag),
    onSuccess: () => invalidateDebt(queryClient),
  })
}

export function useDebtSetHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, flag }: { invoiceId: string; flag: boolean }) =>
      debtApi.setHold(invoiceId, flag),
    onSuccess: () => invalidateDebt(queryClient),
  })
}

export type { DebtBucket, DebtPaymentMethodParam }
