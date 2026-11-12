import { describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useDeepLink, useHighlightFocus } from '@/hooks/use-deep-link'

describe('useDeepLink', () => {
  it('reads the parameters once', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/todays-work?round=r1&visitId=v1&date=bad']}>{children}</MemoryRouter>
    )
    const { result, rerender } = renderHook(() => useDeepLink(), { wrapper })
    expect(result.current).toEqual({ round: 'r1', visitId: 'v1' })
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('useHighlightFocus', () => {
  function Item({ active }: { active: boolean }) {
    const ref = useHighlightFocus<HTMLLIElement>(active)
    return (
      <ul>
        <li ref={ref} tabIndex={-1}>
          item
        </li>
      </ul>
    )
  }

  it('scrolls to and focuses the linked item', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    render(<Item active />)
    expect(scroll).toHaveBeenCalledWith({ block: 'center' })
    expect(screen.getByText('item')).toHaveFocus()
  })

  it('does nothing when the item is not linked, and survives a browser without scrollIntoView', () => {
    const { rerender } = render(<Item active={false} />)
    expect(screen.getByText('item')).not.toHaveFocus()
    // @ts-expect-error simulate an environment without scrollIntoView
    Element.prototype.scrollIntoView = undefined
    rerender(<Item active />)
    expect(screen.getByText('item')).toHaveFocus()
  })
})
