import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Closure } from '@/features/closures/types'
import { ApiError } from '@/lib/errors'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('@/features/closures/hooks/useClosures', () => ({
  useCreateClosure: () => ({ mutateAsync: mocks.create }),
  useUpdateClosure: () => ({ mutateAsync: mocks.update }),
}))

const { ClosureForm } = await import('@/features/closures/components/ClosureForm')

const rounds = [
  { id: 'r1', name: 'Alnwick Mon' },
  { id: 'r2', name: 'Berwick Thu' },
]

const saved: Closure = {
  id: 'c1',
  label: 'Christmas',
  startDate: '2099-12-24',
  endDate: '2099-12-28',
  mode: 'MOVE',
  notifyCustomers: false,
  roundIds: [],
  appliedAt: null,
  createdAt: '2099-01-01T00:00:00Z',
  updatedAt: '2099-01-01T00:00:00Z',
}

function setup(props: { closure?: Closure; rounds?: typeof rounds } = {}) {
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(<ClosureForm rounds={props.rounds ?? rounds} closure={props.closure} onSaved={onSaved} onCancel={onCancel} />)
  return { onSaved, onCancel, user: userEvent.setup() }
}

function fill(label: string, start: string, end: string) {
  fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: label } })
  fireEvent.change(screen.getByLabelText(/^First closed day/), { target: { value: start } })
  fireEvent.change(screen.getByLabelText(/^Last closed day/), { target: { value: end } })
}

beforeEach(() => {
  mocks.create.mockReset()
  mocks.update.mockReset()
})

describe('ClosureForm', () => {
  it('starts with Move, all rounds and customers NOT told', () => {
    setup()
    expect(screen.getByRole('radio', { name: /Move/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'All rounds' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Tell customers' })).not.toBeChecked()
    expect(screen.getByRole('group', { name: 'What happens to visits during the closure' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Which rounds' })).toBeInTheDocument()
    expect(screen.getByText(/Visits due during the closure move to the first open day/)).toBeInTheDocument()
    expect(screen.getByText(/Visits due during the closure are skipped/)).toBeInTheDocument()
    expect(screen.getByText(/one visit after it, not one for each missed cycle/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Tell customers' })).toHaveAccessibleDescription(/Off unless you tick it/)
  })

  it('hides the Move note for Skip', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('radio', { name: /Skip/ }))
    expect(screen.queryByText(/not one for each missed cycle/)).not.toBeInTheDocument()
  })

  it('creates a closure for all rounds with a trimmed label', async () => {
    mocks.create.mockResolvedValue(saved)
    const { user, onSaved } = setup()
    fill('  Christmas  ', '2099-12-24', '2099-12-28')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(mocks.create).toHaveBeenCalledWith({
      label: 'Christmas',
      startDate: '2099-12-24',
      endDate: '2099-12-28',
      mode: 'MOVE',
      notifyCustomers: false,
      roundIds: [],
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('sends only the chosen rounds, Skip and notify when set', async () => {
    mocks.create.mockResolvedValue(saved)
    const { user } = setup()
    fill('Staff holiday', '2099-12-24', '2099-12-24')
    await user.click(screen.getByRole('radio', { name: /Skip/ }))
    await user.click(screen.getByRole('radio', { name: 'Only specific rounds' }))
    await user.click(screen.getByRole('radio', { name: 'All rounds' }))
    expect(screen.queryByRole('checkbox', { name: 'Alnwick Mon' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Only specific rounds' }))
    await user.click(screen.getByRole('checkbox', { name: 'Alnwick Mon' }))
    await user.click(screen.getByRole('checkbox', { name: 'Berwick Thu' }))
    await user.click(screen.getByRole('checkbox', { name: 'Alnwick Mon' }))
    await user.click(screen.getByRole('checkbox', { name: 'Tell customers' }))
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    expect(mocks.create).toHaveBeenCalledWith({
      label: 'Staff holiday',
      startDate: '2099-12-24',
      endDate: '2099-12-24',
      mode: 'SKIP',
      notifyCustomers: true,
      roundIds: ['r2'],
    })
  })

  it('needs at least one round when specific rounds is chosen, and says so when there are none to choose', async () => {
    const { user } = setup({ rounds: [] })
    fill('X', '2099-12-24', '2099-12-25')
    await user.click(screen.getByRole('radio', { name: 'Only specific rounds' }))
    expect(screen.getByText('There are no rounds to choose from yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('Choose at least one round, or pick All rounds.')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('asks for a label and both dates', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('Enter a label for the closure.')).toBeInTheDocument()
    expect(screen.getByText('Choose the first closed day.')).toBeInTheDocument()
    expect(screen.getByText('Choose the last closed day.')).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(screen.getByLabelText(/^Label/)).toBeInvalid()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('accepts a label of 80 characters and rejects 81', async () => {
    mocks.create.mockResolvedValue(saved)
    const { user } = setup()
    fill('a'.repeat(81), '2099-12-24', '2099-12-25')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('The label can be at most 80 characters.')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()

    fill('a'.repeat(80), '2099-12-24', '2099-12-25')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
  })

  it('rejects an end before the start', async () => {
    const { user } = setup()
    fill('X', '2099-12-25', '2099-12-24')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('The last day cannot be before the first day.')).toBeInTheDocument()
  })

  it('accepts 366 days and rejects 367', async () => {
    mocks.create.mockResolvedValue(saved)
    const { user } = setup()
    fill('X', '2099-01-01', '2100-01-02')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('A closure can last at most 366 days.')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()

    fill('X', '2099-01-01', '2100-01-01')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
  })

  it('rejects a closure that has already ended', async () => {
    const { user } = setup()
    fill('X', '2000-01-01', '2000-01-02')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('The closure has already ended. Choose dates that are today or later.')).toBeInTheDocument()
  })

  it('does not stack a range error on a missing start date', async () => {
    mocks.create.mockResolvedValue(saved)
    const { user } = setup()
    fill('X', '', '2099-12-25')
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByText('Choose the first closed day.')).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it.each([
    ['INVALID_CLOSURE_RANGE', /Check the dates/],
    ['UNKNOWN_ROUND', /no longer exists. Refresh/],
    ['VALIDATION_FAILED', /Some details are not right/],
    ['CLOSURE_NOT_FOUND', /may have been deleted/],
  ])('maps the server code %s to a message and keeps the input', async (code, text) => {
    mocks.create.mockRejectedValue(new ApiError(400, 'raw server text', code))
    const { user, onSaved } = setup()
    fill('Christmas', '2099-12-24', '2099-12-28')
    await user.click(screen.getByRole('radio', { name: /Skip/ }))
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.queryByText('raw server text')).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^Label/)).toHaveValue('Christmas')
    expect(screen.getByLabelText(/^First closed day/)).toHaveValue('2099-12-24')
    expect(screen.getByRole('radio', { name: /Skip/ })).toBeChecked()
    // The form can be sent again.
    expect(screen.getByRole('button', { name: 'Save closure' })).toBeEnabled()
  })

  it('uses a generic message for an unknown code, no code, or a network failure', async () => {
    const { user } = setup()
    fill('Christmas', '2099-12-24', '2099-12-28')
    for (const failure of [new ApiError(500, 'x', 'SOMETHING_ELSE'), new ApiError(500, 'x'), new TypeError('network')]) {
      mocks.create.mockRejectedValueOnce(failure)
      await user.click(screen.getByRole('button', { name: 'Save closure' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('The closure could not be saved. Your changes are still here.')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Save closure' })).toBeEnabled())
    }
    expect(mocks.create).toHaveBeenCalledTimes(3)
  })

  it('ignores a second submit while the first is still saving', async () => {
    let finish: (value: Closure) => void = () => undefined
    mocks.create.mockReturnValue(new Promise<Closure>((resolve) => (finish = resolve)))
    const { onSaved } = setup()
    fill('Christmas', '2099-12-24', '2099-12-28')
    const form = screen.getByRole('button', { name: 'Save closure' }).closest('form') as HTMLFormElement
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    finish(saved)
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('edits an existing closure and sends the id', async () => {
    mocks.update.mockResolvedValue({ ...saved, label: 'Xmas' })
    const closure: Closure = { ...saved, mode: 'SKIP', notifyCustomers: true, roundIds: ['r2'] }
    const { user, onSaved } = setup({ closure })
    expect(screen.getByLabelText(/^Label/)).toHaveValue('Christmas')
    expect(screen.getByRole('radio', { name: /Skip/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Only specific rounds' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Berwick Thu' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Tell customers' })).toBeChecked()
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Xmas' } })
    await user.click(screen.getByRole('button', { name: 'Save closure' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(mocks.update).toHaveBeenCalledWith({
      id: 'c1',
      input: {
        label: 'Xmas',
        startDate: '2099-12-24',
        endDate: '2099-12-28',
        mode: 'SKIP',
        notifyCustomers: true,
        roundIds: ['r2'],
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('cancels without saving', async () => {
    const { user, onCancel } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
