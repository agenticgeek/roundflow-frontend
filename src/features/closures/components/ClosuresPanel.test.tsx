import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { Closure } from '@/features/closures/types'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  list: {} as Record<string, unknown>,
  listCalls: 0,
  refetch: vi.fn(),
  remove: vi.fn(),
  removing: false,
  formProps: null as Record<string, unknown> | null,
  rounds: [] as unknown[],
}))

vi.mock('@/features/closures/hooks/useClosures', () => ({
  useClosures: () => {
    mocks.listCalls += 1
    return { refetch: mocks.refetch, ...mocks.list }
  },
  useDeleteClosure: () => ({ mutateAsync: mocks.remove, isPending: mocks.removing }),
}))
vi.mock('@/features/rounds/hooks/useRounds', () => ({
  useRounds: () => ({ data: mocks.rounds }),
}))
vi.mock('@/features/closures/components/ClosureForm', () => ({
  ClosureForm: (props: { closure?: Closure; rounds: unknown[]; onSaved: (c: Closure) => void; onCancel: () => void }) => {
    mocks.formProps = props as unknown as Record<string, unknown>
    return (
      <div>
        <p>form for {props.closure?.id ?? 'new'}</p>
        <button type="button" onClick={() => props.onSaved(props.closure as Closure)}>
          mock save
        </button>
        <button type="button" onClick={props.onCancel}>
          mock cancel
        </button>
      </div>
    )
  },
}))
vi.mock('@/features/closures/components/ApplyPreviewDialog', () => ({
  ApplyPreviewDialog: (props: { closure: Closure; open: boolean; onClose: () => void }) => (
    <div role="dialog" aria-label="mock preview">
      <p>preview for {props.closure.id}</p>
      <button type="button" onClick={props.onClose}>
        mock close preview
      </button>
    </div>
  ),
}))

const { ClosuresPanel } = await import('@/features/closures/components/ClosuresPanel')

function closure(overrides: Partial<Closure> = {}): Closure {
  return {
    id: 'c1',
    label: 'Christmas',
    startDate: '2026-12-24',
    endDate: '2026-12-28',
    mode: 'MOVE',
    notifyCustomers: false,
    roundIds: [],
    appliedAt: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

function ready(closures: Closure[]) {
  mocks.list = { isPending: false, isError: false, data: { closures } }
}

beforeEach(() => {
  mocks.list = {}
  mocks.listCalls = 0
  mocks.refetch.mockReset()
  mocks.remove.mockReset()
  mocks.removing = false
  mocks.formProps = null
  mocks.rounds = [
    { id: 'r1', name: 'Alnwick Mon', status: 'ACTIVE' },
    { id: 'r2', name: 'Berwick Thu', status: 'DRAFT' },
    { id: 'r3', name: 'Old round', status: 'ARCHIVED' },
  ]
})

describe('ClosuresPanel roles', () => {
  it.each(['ADMIN', 'MANAGER'] as const)('shows the section to a %s', (role) => {
    setBootstrap({ role })
    ready([])
    renderWithProviders(<ClosuresPanel />)
    expect(screen.getByRole('heading', { name: 'Closures' })).toBeInTheDocument()
  })

  it.each(['TECHNICIAN', undefined] as const)('shows nothing, and makes no request, for %s', (role) => {
    setBootstrap({ role })
    const { container } = renderWithProviders(<ClosuresPanel />)
    expect(container).toBeEmptyDOMElement()
    expect(mocks.listCalls).toBe(0)
  })
})

describe('ClosuresPanel list', () => {
  it('shows a loading status', () => {
    mocks.list = { isPending: true, isError: false }
    renderWithProviders(<ClosuresPanel />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading closures')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('still lists closures while the rounds are loading, naming unknown rounds generically', () => {
    mocks.rounds = undefined as never
    ready([closure({ roundIds: ['r1'] })])
    renderWithProviders(<ClosuresPanel />)
    expect(screen.getByText('Rounds: A round that no longer exists')).toBeInTheDocument()
  })

  it('shows the empty state', () => {
    ready([])
    renderWithProviders(<ClosuresPanel />)
    expect(screen.getByText('No closures yet. Add one when your business will be closed.')).toBeInTheDocument()
  })

  it('shows an error with a retry', async () => {
    mocks.list = { isPending: false, isError: true }
    const { user } = renderWithProviders(<ClosuresPanel />)
    expect(screen.getByRole('alert')).toHaveTextContent('The closures could not be loaded.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
  })

  it('lists closures by start date with mode, dates, rounds and applied state', () => {
    ready([
      closure({ id: 'c3', label: 'Late one', startDate: '2027-03-01', endDate: '2027-03-01', mode: 'SKIP', roundIds: ['r1', 'r2'] }),
      closure({ id: 'c1', label: 'Christmas' }),
      closure({
        id: 'c2', label: 'Staff holiday', startDate: '2027-01-04', endDate: '2027-01-08', roundIds: ['r9'],
        appliedAt: '2027-01-02T10:00:00Z', updatedAt: '2027-01-01T00:00:00Z',
      }),
    ])
    renderWithProviders(<ClosuresPanel />)
    const items = within(screen.getByRole('list', { name: 'Closures' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Christmas')
    expect(items[1]).toHaveTextContent('Staff holiday')
    expect(items[2]).toHaveTextContent('Late one')

    expect(items[0]).toHaveTextContent('Move')
    expect(items[0]).toHaveTextContent('Thu 24 Dec 2026 to Mon 28 Dec 2026')
    expect(items[0]).toHaveTextContent('All rounds')
    expect(items[0]).toHaveTextContent('Not applied to existing visits')

    expect(items[1]).toHaveTextContent('Rounds: A round that no longer exists')
    expect(items[1]).toHaveTextContent('Applied Sat 2 Jan 2027')
    expect(items[1]).not.toHaveTextContent('Not applied')
    expect(items[1]).not.toHaveTextContent('changed after it was applied')

    expect(items[2]).toHaveTextContent('Skip')
    expect(items[2]).toHaveTextContent('Mon 1 Mar 2027')
    expect(items[2]).not.toHaveTextContent('2027 to')
    expect(items[2]).toHaveTextContent('Rounds: Alnwick Mon, Berwick Thu')
  })

  it('prompts to apply again when a closure was edited after it was applied', () => {
    ready([closure({ appliedAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-12T10:00:00Z' })])
    renderWithProviders(<ClosuresPanel />)
    expect(screen.getByText(/changed after it was applied/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply again Christmas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply to existing visits Christmas' })).not.toBeInTheDocument()
  })

  it('gives every row action a name that says which closure it is for, at 24px or more', () => {
    ready([closure()])
    renderWithProviders(<ClosuresPanel />)
    for (const name of ['Edit Christmas', 'Apply to existing visits Christmas', 'Delete Christmas']) {
      expect(screen.getByRole('button', { name })).toHaveClass('min-h-6')
    }
  })
})

describe('ClosuresPanel add and edit', () => {
  it('closes the form on Escape', async () => {
    ready([])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Add a closure' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds a closure in a dialog and closes it when saved', async () => {
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Add a closure' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a closure' })
    expect(within(dialog).getByText('form for new')).toBeInTheDocument()
    // Archived rounds are not offered; draft and active ones are.
    expect(mocks.formProps?.rounds).toEqual([
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ id: 'r2' }),
    ])
    await user.click(within(dialog).getByRole('button', { name: 'mock save' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits the chosen closure and closes the dialog on cancel', async () => {
    ready([closure({ id: 'c1' }), closure({ id: 'c2', label: 'Other', startDate: '2027-01-01', endDate: '2027-01-02' })])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Edit Other' }))
    expect(screen.getByRole('dialog', { name: 'Edit closure' })).toHaveTextContent('form for c2')
    await user.click(screen.getByRole('button', { name: 'mock cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Adding after editing starts a blank form.
    await user.click(screen.getByRole('button', { name: 'Add a closure' }))
    expect(screen.getByText('form for new')).toBeInTheDocument()
  })
})

describe('ClosuresPanel delete', () => {
  it('asks first, says visits are not restored, and keeps the closure on cancel', async () => {
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Delete Christmas' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this closure?' })
    expect(dialog).toHaveTextContent('does not restore visits that were already moved or skipped')
    expect(dialog).toHaveTextContent('"Christmas"')
    await user.click(within(dialog).getByRole('button', { name: 'Keep closure' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('deletes after confirming and closes the dialog', async () => {
    mocks.remove.mockResolvedValue(undefined)
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Delete Christmas' }))
    await user.click(screen.getByRole('button', { name: 'Delete closure' }))
    expect(mocks.remove).toHaveBeenCalledWith('c1')
    await vi.waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('shows an error and stays open when the delete fails, and clears it on reopen', async () => {
    mocks.remove.mockRejectedValue(new Error('boom'))
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Delete Christmas' }))
    await user.click(screen.getByRole('button', { name: 'Delete closure' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The closure could not be deleted. Try again.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep closure' }))
    await user.click(screen.getByRole('button', { name: 'Delete Christmas' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows progress while deleting', async () => {
    mocks.removing = true
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Delete Christmas' }))
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
  })
})

describe('ClosuresPanel apply', () => {
  it('opens the preview for the chosen closure and closes it again', async () => {
    ready([closure()])
    const { user } = renderWithProviders(<ClosuresPanel />)
    await user.click(screen.getByRole('button', { name: 'Apply to existing visits Christmas' }))
    expect(screen.getByText('preview for c1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'mock close preview' }))
    expect(screen.queryByText('preview for c1')).not.toBeInTheDocument()
  })
})
