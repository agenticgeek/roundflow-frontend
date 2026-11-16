import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { RescheduleVisitModal } from '@/components/round-planner/RescheduleVisitModal'
import { server } from '@/test/msw/server'
import { API, apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const visit = { visitId: 'v1', addressLine: '1 High St' }

function renderModal(onClose = vi.fn()) {
  return renderWithProviders(<RescheduleVisitModal open visit={visit} onClose={onClose} />)
}

describe('RescheduleVisitModal', () => {
  it('books the visit onto the chosen date and closes', async () => {
    let body: unknown
    server.use(
      on('patch', '/visits/{id}/reschedule', async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'v1', status: 'SCHEDULED', date: '2099-01-02' })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    expect(screen.getByText('1 High St')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(await screen.findByText('Visit rescheduled')).toBeInTheDocument()
    expect(body).toEqual({ date: '2099-01-02' })
    expect(onClose).toHaveBeenCalled()
  })

  it('needs a date that is today or later', async () => {
    let called = false
    server.use(on('patch', '/visits/{id}/reschedule', () => ((called = true), HttpResponse.json({}))))
    const { user } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(await screen.findByText('Pick today or a later date.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2000-01-01' } })
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(called).toBe(false)
  })

  it('shows the server error and stays open', async () => {
    server.use(on('patch', '/visits/{id}/reschedule', () => apiError(409, 'Only scheduled or skipped visits can be rescheduled')))
    const onClose = vi.fn()
    const { user } = renderModal(onClose)
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(await screen.findByText('Only scheduled or skipped visits can be rescheduled')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})

// Business closures: a non-blocking warning for a date inside a closure.
const christmas = {
  id: 'c1', label: 'Christmas', startDate: '2099-01-01', endDate: '2099-01-05', mode: 'MOVE', notifyCustomers: false,
  roundIds: [] as string[], appliedAt: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
}

function closuresReturn(closures: unknown[]) {
  server.use(http.get(`${API}/closures`, () => HttpResponse.json({ closures })))
}

function renderFor(visitOverrides: Partial<typeof visit & { roundId: string }> = {}, onClose = vi.fn()) {
  return renderWithProviders(<RescheduleVisitModal open visit={{ ...visit, ...visitOverrides }} onClose={onClose} />)
}

describe('RescheduleVisitModal closure warning', () => {
  it('warns while picking a date inside a closure, announces it, and never disables Reschedule', async () => {
    closuresReturn([christmas])
    const { user } = renderFor()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(/This date is inside Christmas: \w{3} 1 Jan 2099 to \w{3} 5 Jan 2099\./)
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeEnabled()

    server.use(on('patch', '/visits/{id}/reschedule', () => HttpResponse.json({ id: 'v1', status: 'SCHEDULED', date: '2099-01-02' })))
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(await screen.findByText('Visit rescheduled')).toBeInTheDocument()
  })

  it('shows no warning for a date outside the closure, and drops it when the date changes', async () => {
    closuresReturn([christmas])
    renderFor()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await screen.findByRole('status')
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-06' } })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('only warns for a round-scoped closure when it covers the visit round', async () => {
    closuresReturn([{ ...christmas, roundIds: ['r2'] }])
    const other = renderFor({ roundId: 'r1' })
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    other.unmount()

    const same = renderFor({ roundId: 'r2' })
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    expect(await screen.findByRole('status')).toHaveTextContent('Christmas')
    same.unmount()

    // Round unknown: only closures that apply to every round can be said to apply.
    renderFor()
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('keeps the dialog open to show the warning the server returns, then closes on Done', async () => {
    server.use(
      on('patch', '/visits/{id}/reschedule', () =>
        HttpResponse.json({
          id: 'v1', status: 'SCHEDULED', date: '2099-01-02',
          warnings: [{ code: 'DATE_IN_CLOSURE', closureId: 'c1', label: 'Christmas', startDate: '2099-01-01', endDate: '2099-01-05' }],
        }),
      ),
    )
    const onClose = vi.fn()
    const { user } = renderFor({}, onClose)
    fireEvent.change(screen.getByLabelText('New date'), { target: { value: '2099-01-02' } })
    await user.click(screen.getByRole('button', { name: 'Reschedule' }))
    expect(await screen.findByRole('status')).toHaveTextContent('This date is inside Christmas')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Reschedule' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
