import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  debtApi,
  type DebtBoardParams,
  type DebtBucket,
  type DebtHoldInput,
  type DebtPaymentLinkInput,
  type DebtPaymentMethodParam,
  type DebtRemindInput,
} from '@/api/debt.api'
import { ApiError } from '@/lib/errors'
import { DEBT_BOARD_PAGE_SIZE, invalidateDebt, invalidateServiceChange, queryKeys } from '@/lib/query-keys'
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
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? DEBT_BOARD_PAGE_SIZE
  return useQuery({
    queryKey: queryKeys.debt.board(
      params.bucket,
      params.roundId,
      params.paymentMethod,
      page,
      pageSize,
      params.search ?? '',
    ),
    queryFn: ({ signal }) => debtApi.board({ ...params, page, pageSize }, signal),
    enabled: useDebtEnabled(enabled) && Boolean(params.bucket),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/**
 * Every tab's total from GET /debt/board/counts in one request. A backend without that
 * route yet (404) falls back to one `pageSize=1` board request per bucket.
 */
export function useDebtBoardCounts(
  filters: { roundId?: string; paymentMethod?: DebtPaymentMethodParam; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.debt.boardCounts(filters.roundId, filters.paymentMethod, filters.search ?? ''),
    queryFn: async ({ signal }): Promise<Record<DebtBucket, number>> => {
      try {
        const counts = await debtApi.counts(filters, signal)
        // The board's "Invoice sent" tab is the backend's catch-all `ALL` bucket.
        return Object.fromEntries(
          DEBT_BUCKETS.map((bucket) => [
            bucket,
            (bucket === 'INVOICE_SENT' ? counts.ALL : counts[bucket]) ?? 0,
          ]),
        ) as Record<DebtBucket, number>
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error
        const totals = await Promise.all(
          DEBT_BUCKETS.map((bucket) =>
            debtApi
              .board({ bucket, ...filters, page: 1, pageSize: 1 }, signal)
              .then((result) => result.pagination.total),
          ),
        )
        return Object.fromEntries(DEBT_BUCKETS.map((bucket, index) => [bucket, totals[index] ?? 0])) as Record<
          DebtBucket,
          number
        >
      }
    },
    enabled: useDebtEnabled(enabled),
    placeholderData: keepPreviousData,
  })
}

/** GET /debt/:id — phone, email, round, next visit, mandate and recent visits for the panel. */
export function useDebtInvoiceDetail(invoiceId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.debt.detail(invoiceId ?? ''),
    queryFn: ({ signal }) => debtApi.detail(invoiceId!, signal),
    enabled: useDebtEnabled(enabled) && Boolean(invoiceId),
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
    // The modal shows the error inline with its fix (GAP-034).
    meta: { silenceGlobalError: true },
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
    meta: { silenceGlobalError: true },
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
    mutationFn: ({ invoiceId, ...input }: { invoiceId: string } & DebtHoldInput) =>
      debtApi.setHold(invoiceId, input),
    // GAP-026: the hold flags the customer's upcoming visits — Today's Work, the planner and
    // the customer page all show it.
    onSuccess: () => invalidateServiceChange(queryClient),
  })
}

export type { DebtBucket, DebtPaymentMethodParam }
