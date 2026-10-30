import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { QueryProvider, queryClient } from '@/providers/QueryProvider'

afterEach(() => {
  vi.useRealTimers()
})

describe('FullScreenLoader (GAP-005)', () => {
  it('offers Retry once loading takes longer than the timeout', () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } })
    try {
      const { unmount } = render(<FullScreenLoader />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(15_000))
      expect(screen.getByRole('alert')).toHaveTextContent('Can’t reach RoundFlow')
      act(() => screen.getByRole('button', { name: 'Retry' }).click())
      expect(reload).toHaveBeenCalled()
      unmount()
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })

  it('honours a custom timeout', () => {
    vi.useFakeTimers()
    render(<FullScreenLoader timeoutMs={10} />)
    act(() => vi.advanceTimersByTime(10))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('QueryProvider', () => {
  it('provides the app query client', () => {
    render(<QueryProvider><p>child</p></QueryProvider>)
    expect(screen.getByText('child')).toBeInTheDocument()
    expect(queryClient.getDefaultOptions().queries?.retryDelay).toBeTypeOf('function')
  })
})
