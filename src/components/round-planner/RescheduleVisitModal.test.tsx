import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { RescheduleVisitModal } from '@/components/round-planner/RescheduleVisitModal'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
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
