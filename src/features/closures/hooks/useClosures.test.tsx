import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  useApplyClosure,
  useClosureApplyPreview,
  useClosures,
  useCreateClosure,
  useDeleteClosure,
  useUpdateClosure,
} from '@/features/closures/hooks/useClosures'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { createTestQueryClient } from '@/test/render'
import { queryKeys } from '@/lib/query-keys'

const closure = {
  id: 'c1', label: 'Christmas', startDate: '2026-12-24', endDate: '2027-01-03', mode: 'MOVE', notifyCustomers: false,
  roundIds: [], appliedAt: null, createdAt: 'x', updatedAt: 'x',
}

function setup() {
  const client = createTestQueryClient()
  const spy = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, spy, wrapper }
}

function invalidatedKeys(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.map((call) => (call[0] as { queryKey: readonly unknown[] }).queryKey)
}

const EXPECTED_KEYS = [queryKeys.closures.all, queryKeys.rounds.all, queryKeys.today.all]

describe('query keys', () => {
  it('builds list keys with and without params', () => {
    expect(queryKeys.closures.list()).toEqual(['closures', 'list', '', ''])
    expect(queryKeys.closures.list({ from: 'a', to: 'b' })).toEqual(['closures', 'list', 'a', 'b'])
    expect(queryKeys.closures.list({})).toEqual(['closures', 'list', '', ''])
  })
})

describe('useClosures', () => {
  it('loads the list, passing from and to, and is pending first', async () => {
    let search = ''
    server.use(
      http.get(`${API}/closures`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({ closures: [closure] })
      }),
    )
    const { result } = renderHook(() => useClosures({ from: '2026-12-01', to: '2027-01-31' }), { wrapper: setup().wrapper })
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.data?.closures).toHaveLength(1))
    expect(search).toBe('?from=2026-12-01&to=2027-01-31')
  })

  it('exposes the error, and stays idle when disabled', async () => {
    server.use(http.get(`${API}/closures`, () => HttpResponse.json({ error: 'Boom', code: 'X' }, { status: 500 })))
    const failing = renderHook(() => useClosures(), { wrapper: setup().wrapper })
    await waitFor(() => expect(failing.result.current.isError).toBe(true))
    expect(failing.result.current.error).toMatchObject({ status: 500 })

    const idle = renderHook(() => useClosures(undefined, false), { wrapper: setup().wrapper })
    expect(idle.result.current.fetchStatus).toBe('idle')
  })
})

describe('closure mutations', () => {
  it('create posts and invalidates closures, rounds (planner) and today', async () => {
    server.use(http.post(`${API}/closures`, () => HttpResponse.json(closure, { status: 201 })))
    const { wrapper, spy } = setup()
    const { result } = renderHook(() => useCreateClosure(), { wrapper })
    expect(result.current.isPending).toBe(false)
    await act(() => result.current.mutateAsync({ label: 'Christmas', startDate: '2026-12-24', endDate: '2027-01-03', mode: 'MOVE' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })

  it('create reports a server error and invalidates nothing', async () => {
    server.use(http.post(`${API}/closures`, () => HttpResponse.json({ error: 'Bad range', code: 'INVALID_CLOSURE_RANGE' }, { status: 400 })))
    const { wrapper, spy } = setup()
    const { result } = renderHook(() => useCreateClosure(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ label: 'x', startDate: '2026-12-24', endDate: '2026-12-20', mode: 'SKIP' }).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'INVALID_CLOSURE_RANGE' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('update patches by id and invalidates the same keys', async () => {
    let body: unknown
    server.use(
      http.patch(`${API}/closures/c1`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(closure)
      }),
    )
    const { wrapper, spy } = setup()
    const { result } = renderHook(() => useUpdateClosure(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 'c1', input: { mode: 'SKIP' } }))
    expect(body).toEqual({ mode: 'SKIP' })
    expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })

  it('delete removes by id and invalidates the same keys', async () => {
    server.use(http.delete(`${API}/closures/c1`, () => new HttpResponse(null, { status: 204 })))
    const { wrapper, spy } = setup()
    const { result } = renderHook(() => useDeleteClosure(), { wrapper })
    await act(() => result.current.mutateAsync('c1'))
    expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })

  it('preview returns the preview and invalidates nothing', async () => {
    server.use(http.post(`${API}/closures/c1/apply/preview`, () => HttpResponse.json({ closureId: 'c1', mode: 'MOVE', totals: { visits: 3 } })))
    const { spy, wrapper } = setup()
    const { result } = renderHook(() => useClosureApplyPreview(), { wrapper })
    await act(() => result.current.mutateAsync('c1'))
    await waitFor(() => expect(result.current.data).toMatchObject({ closureId: 'c1' }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('preview exposes the server error', async () => {
    server.use(http.post(`${API}/closures/c1/apply/preview`, () => HttpResponse.json({ error: 'Gone', code: 'CLOSURE_NOT_FOUND' }, { status: 404 })))
    const { result } = renderHook(() => useClosureApplyPreview(), { wrapper: setup().wrapper })
    await act(async () => {
      await result.current.mutateAsync('c1').catch(() => undefined)
    })
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'CLOSURE_NOT_FOUND' }))
  })
})

describe('useApplyClosure idempotency', () => {
  function captureKeys() {
    const keys: (string | null)[] = []
    let fail = 0
    server.use(
      http.post(`${API}/closures/:id/apply`, ({ request }) => {
        keys.push(request.headers.get('idempotency-key'))
        if (fail > 0) {
          fail -= 1
          return HttpResponse.json({ error: 'Down', code: 'X' }, { status: 502 })
        }
        return HttpResponse.json({ closureId: 'c1', mode: 'MOVE', moved: 1, skipped: 0, conflicts: [], notifiedTechnicians: 0, notifiedCustomers: 0, appliedAt: 'now' })
      }),
    )
    return {
      keys,
      failNext: (n: number) => {
        fail = n
      },
    }
  }

  it('sends one key, reuses it on a retry of the same attempt, and invalidates on success', async () => {
    const { keys, failNext } = captureKeys()
    failNext(1)
    const { wrapper, spy } = setup()
    const { result } = renderHook(() => useApplyClosure(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', input: { notifyCustomers: true } }).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(spy).not.toHaveBeenCalled()
    await act(() => result.current.mutateAsync({ id: 'c1', input: { notifyCustomers: true } }))
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).toBe(keys[0])
    expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })

  it('uses a fresh key after a success, and for different input after a failure', async () => {
    const { keys } = captureKeys()
    const { result } = renderHook(() => useApplyClosure(), { wrapper: setup().wrapper })
    await act(() => result.current.mutateAsync({ id: 'c1' }))
    await act(() => result.current.mutateAsync({ id: 'c1' }))
    expect(keys[1]).not.toBe(keys[0])

    const { keys: k2, failNext } = captureKeys()
    failNext(2)
    const second = renderHook(() => useApplyClosure(), { wrapper: setup().wrapper })
    await act(async () => {
      await second.result.current.mutateAsync({ id: 'c1', input: { notifyCustomers: false } }).catch(() => undefined)
      await second.result.current.mutateAsync({ id: 'c1', input: { notifyCustomers: true } }).catch(() => undefined)
    })
    expect(k2[1]).not.toBe(k2[0])
  })
})
