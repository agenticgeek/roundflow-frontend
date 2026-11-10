import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDeleteFloConversation, useFloConversations } from '@/features/flo/hooks/useFloConversations'
import { useFloMode } from '@/features/flo/hooks/useFloMode'
import { useFloStatus, useFloSuggestions } from '@/features/flo/hooks/useFloStatus'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { createTestQueryClient } from '@/test/render'

function wrapperFor(client = createTestQueryClient()) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('useFloMode', () => {
  it('starts on Balanced and remembers the choice', () => {
    const { result, unmount } = renderHook(() => useFloMode())
    expect(result.current[0]).toBe('BALANCED')
    act(() => result.current[1]('QUICK'))
    expect(result.current[0]).toBe('QUICK')
    unmount()
    expect(renderHook(() => useFloMode()).result.current[0]).toBe('QUICK')
  })

  it('ignores a stored value it does not know', () => {
    localStorage.setItem('roundflow.flo.mode', 'TURBO')
    expect(renderHook(() => useFloMode()).result.current[0]).toBe('BALANCED')
  })

  it('works with storage blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useFloMode())
    expect(result.current[0]).toBe('BALANCED')
    act(() => result.current[1]('THOROUGH'))
    expect(result.current[0]).toBe('THOROUGH')
  })
})

describe('useFloStatus and useFloSuggestions', () => {
  it('load status and suggestions, and stay idle when disabled', async () => {
    const wrapper = wrapperFor()
    const status = renderHook(() => useFloStatus(), { wrapper })
    const suggestions = renderHook(() => useFloSuggestions(), { wrapper })
    await waitFor(() => expect(status.result.current.data?.dailyRemaining).toBe(42))
    await waitFor(() => expect(suggestions.result.current.data?.groups).toHaveLength(2))

    const idle = renderHook(() => useFloStatus(false), { wrapper: wrapperFor() })
    expect(idle.result.current.fetchStatus).toBe('idle')
  })
})

describe('useFloConversations', () => {
  it('lists conversations only when enabled, and deletes one then refreshes the list', async () => {
    let listed = 0
    server.use(
      http.get(`${API}/flo/conversations`, () => {
        listed += 1
        return HttpResponse.json({ conversations: [{ id: 'c1', title: 'First' }], nextCursor: null })
      }),
      http.delete(`${API}/flo/conversations/c1`, () => new HttpResponse(null, { status: 204 })),
    )
    const client = createTestQueryClient()
    const wrapper = wrapperFor(client)
    const closed = renderHook(() => useFloConversations(false), { wrapper })
    expect(closed.result.current.fetchStatus).toBe('idle')

    const open = renderHook(() => useFloConversations(true), { wrapper })
    await waitFor(() => expect(open.result.current.data?.conversations).toHaveLength(1))
    expect(listed).toBe(1)

    const remove = renderHook(() => useDeleteFloConversation(), { wrapper })
    await act(async () => {
      await remove.result.current.mutateAsync('c1')
    })
    await waitFor(() => expect(listed).toBe(2))
  })
})
