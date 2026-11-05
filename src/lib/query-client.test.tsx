import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui/toast'
import { ApiError } from '@/lib/errors'
import { fetchOrNetworkError, isNetworkError, NetworkError } from '@/lib/network-error'
import { createAppQueryClient, notifyNetworkError, retryDelay, shouldRetryQuery } from '@/lib/query-client'
import { useUiStore } from '@/stores/ui.store'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('retry policy (GAP-005)', () => {
  it('retries GETs twice on network errors and 5xx, never on 4xx', () => {
    expect(shouldRetryQuery(0, new NetworkError())).toBe(true)
    expect(shouldRetryQuery(2, new NetworkError())).toBe(false)
    expect(shouldRetryQuery(1, new ApiError(503, 'down'))).toBe(true)
    expect(shouldRetryQuery(2, new ApiError(503, 'down'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(404, 'missing'))).toBe(false)
  })

  it('backs off exponentially up to 8s', () => {
    expect([0, 1, 2, 3, 6].map(retryDelay)).toEqual([1000, 2000, 4000, 8000, 8000])
  })
})

describe('network errors', () => {
  it('identifies NetworkError and passes other fetch errors through as one', async () => {
    expect(isNetworkError(new NetworkError())).toBe(true)
    expect(isNetworkError(new Error('x'))).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(null))
    await expect(fetchOrNetworkError('/x', {})).rejects.toBeInstanceOf(NetworkError)
  })

  it('shows one toast at a time, whose Retry re-runs and dismisses', async () => {
    const retry = vi.fn()
    render(<ToastProvider>{null}</ToastProvider>)
    act(() => {
      notifyNetworkError(retry)
      notifyNetworkError(retry)
    })
    expect(useUiStore.getState().toasts).toHaveLength(1)
    expect(screen.getByText('Can’t reach RoundFlow')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().toasts).toHaveLength(0)
  })
})

describe('createAppQueryClient', () => {
  it('toasts a failed query only for network errors, and Retry refetches failed queries', async () => {
    const client = createAppQueryClient()
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue()
    await client
      .fetchQuery({ queryKey: ['a'], queryFn: () => Promise.reject(new ApiError(404, 'missing')), retry: false })
      .catch(() => undefined)
    expect(useUiStore.getState().toasts).toHaveLength(0)

    await client
      .fetchQuery({ queryKey: ['b'], queryFn: () => Promise.reject(new NetworkError()), retry: false })
      .catch(() => undefined)
    const [toast] = useUiStore.getState().toasts
    expect(toast?.key).toBe('network-error')
    toast?.action?.onClick()
    expect(refetch).toHaveBeenCalledTimes(1)
    const options = refetch.mock.calls[0]![0] as { predicate: (query: { state: { status: string } }) => boolean }
    expect(options.predicate({ state: { status: 'error' } })).toBe(true)
    expect(options.predicate({ state: { status: 'success' } })).toBe(false)
  })

  it('mutation errors: network → Retry toast, server error → its message, 4xx form errors stay inline', async () => {
    const client = createAppQueryClient()
    const run = (error: unknown, meta?: Record<string, unknown>) =>
      client
        .getMutationCache()
        .build(client, { mutationFn: () => Promise.reject(error), meta })
        .execute(undefined)
        .catch(() => undefined)

    await run(new ApiError(400, 'Bad'))
    await run(new ApiError(401, 'Signed out'))
    await run(new ApiError(403, 'Forbidden'))
    await run(new ApiError(500, 'Boom'), { silenceGlobalError: true })
    expect(useUiStore.getState().toasts).toHaveLength(0)

    await run(new ApiError(409, 'Already paid'))
    expect(useUiStore.getState().toasts.map((toast) => toast.message)).toEqual(['Already paid'])

    let attempts = 0
    const flaky = client.getMutationCache().build(client, {
      mutationFn: () => {
        attempts += 1
        return attempts === 1 ? Promise.reject(new NetworkError()) : Promise.resolve('ok')
      },
    })
    await flaky.execute('vars').catch(() => undefined)
    const network = useUiStore.getState().toasts.find((toast) => toast.key === 'network-error')
    expect(network).toBeDefined()
    network?.action?.onClick()
    await vi.waitFor(() => expect(attempts).toBe(2))
  })
})
