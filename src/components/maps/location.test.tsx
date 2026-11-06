import { describe, expect, it } from 'vitest'
import { act, renderHook, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { LocationNote } from '@/components/maps/LocationNote'
import { ToastProvider } from '@/components/ui/toast'
import { useLocationWarning } from '@/features/maps/hooks/useLocationWarning'
import { useUiStore } from '@/stores/ui.store'

describe('LocationNote (ACT-10)', () => {
  it('flags an approximate location, with the explanation', () => {
    render(<LocationNote latitude={55} locationApproximate />)
    expect(screen.getByText('Approximate location')).toBeInTheDocument()
    expect(screen.getByText(/best guess/)).toBeInTheDocument()
  })

  it('flags a location that was not found, and stays silent otherwise', () => {
    const { rerender, container } = render(<LocationNote latitude={null} />)
    expect(screen.getByText('Location not found')).toBeInTheDocument()
    rerender(<LocationNote latitude={55} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<LocationNote />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('useLocationWarning (ACT-10)', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <ToastProvider>{children}</ToastProvider>
  }

  it('toasts only when the save came back without coordinates', () => {
    useUiStore.setState({ toasts: [] })
    const { result } = renderHook(() => useLocationWarning(), { wrapper })
    act(() => {
      result.current({ latitude: 55 })
      result.current({})
      result.current(null)
    })
    expect(useUiStore.getState().toasts).toHaveLength(0)
    act(() => result.current({ latitude: null, longitude: null }))
    expect(useUiStore.getState().toasts).toHaveLength(1)
    expect(useUiStore.getState().toasts[0].message).toBe('Saved, but there is no map location yet')
  })
})
