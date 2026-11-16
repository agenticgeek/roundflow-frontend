import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CarryoverOption } from '@/api/carryover.api'
import { CarryoverChoice } from '@/components/todays-work/CarryoverChoice'
import type { Closure } from '@/features/closures/types'

// Business closures: a non-blocking warning when a carry-over day falls inside a closure.

const friday = [
  { key: 'SATURDAY', date: '2026-11-07', label: 'Saturday', default: false },
  { key: 'MONDAY', date: '2026-11-09', label: 'Monday', default: true },
] as CarryoverOption[]
const thursday = [{ key: 'NEXT_WORKING_DAY', date: '2026-11-06', label: 'Friday', default: true }] as CarryoverOption[]

const closure: Closure = {
  id: 'c1', label: 'Staff holiday', startDate: '2026-11-09', endDate: '2026-11-10', mode: 'MOVE', notifyCustomers: false,
  roundIds: [], appliedAt: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
}

function renderChoice(props: Partial<Parameters<typeof CarryoverChoice>[0]> = {}) {
  const onChange = vi.fn()
  const view = render(
    <CarryoverChoice
      options={friday} loading={false} failed={false} value="MONDAY" onChange={onChange}
      notify={false} onNotify={vi.fn()} onRetry={vi.fn()} {...props}
    />,
  )
  return { ...view, onChange }
}

describe('CarryoverChoice closure warning', () => {
  it('shows nothing without closures', () => {
    renderChoice()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('warns, as a status, when the chosen day is inside a closure found locally', () => {
    renderChoice({ closures: [closure] })
    expect(screen.getByRole('status')).toHaveTextContent('This date is inside Staff holiday: Mon 9 Nov 2026 to Tue 10 Nov 2026.')
    // The tell-customers box and the options are still usable.
    expect(screen.getByRole('checkbox', { name: 'Also tell affected customers' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: /Saturday/ })).toBeEnabled()
  })

  it('follows the choice: no warning for a day outside the closure, a warning once picked', async () => {
    const user = userEvent.setup()
    const { rerender, onChange } = renderChoice({ closures: [closure], value: 'SATURDAY' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Monday/ }))
    expect(onChange).toHaveBeenCalledWith('MONDAY')
    rerender(
      <CarryoverChoice options={friday} loading={false} failed={false} value="MONDAY" onChange={onChange}
        notify={false} onNotify={vi.fn()} onRetry={vi.fn()} closures={[closure]} />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows no warning while no option is chosen yet', () => {
    renderChoice({ closures: [closure], value: null })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('uses the single next working day', () => {
    renderChoice({ options: thursday, value: 'NEXT_WORKING_DAY', closures: [{ ...closure, startDate: '2026-11-06', endDate: '2026-11-06' }] })
    expect(screen.getByRole('status')).toHaveTextContent('Staff holiday')
  })

  it('warns from the closure marker the server puts on an option, without dates', () => {
    const marked = [{ ...thursday[0], closure: { closureId: 'c9', label: 'Christmas' } }] as unknown as CarryoverOption[]
    renderChoice({ options: marked, value: 'NEXT_WORKING_DAY' })
    expect(screen.getByRole('status')).toHaveTextContent('Closed: Christmas')
  })
})
