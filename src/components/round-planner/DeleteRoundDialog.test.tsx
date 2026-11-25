import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { server } from '@/test/msw/server'
import { API, apiError } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'
import { DeleteRoundDialog } from '@/components/round-planner/DeleteRoundDialog'
import type { RoundDeletePreview } from '@/features/rounds/lib/delete-round'

const target = { id: 'r1', name: 'Alnwick Fri' }

const preview: RoundDeletePreview = {
  propertyCount: 3,
  upcomingVisitCount: 5,
  detachedVisitCount: 0,
  emergencyCount: 0,
  attachedVisitCount: 0,
  canDelete: true,
}

let previewCalls = 0
let deletes = 0

function usePreview(...bodies: RoundDeletePreview[]) {
  server.use(
    http.get(`${API}/rounds/r1/delete-preview`, () => {
      const body = bodies[Math.min(previewCalls, bodies.length - 1)]
      previewCalls += 1
      return HttpResponse.json(body)
    }),
  )
}

beforeEach(() => {
  previewCalls = 0
  deletes = 0
  usePreview(preview)
  server.use(
    http.delete(`${API}/rounds/r1`, () => {
      deletes += 1
      return HttpResponse.json({ deleted: true, unassignedProperties: 3, deletedVisits: 5, detachedVisits: 0 })
    }),
  )
})

function renderDialog() {
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  const utils = renderWithProviders(<DeleteRoundDialog round={target} onClose={onClose} onDeleted={onDeleted} />)
  return { ...utils, onClose, onDeleted }
}

const deleteButton = () => screen.getByRole('button', { name: 'Delete round' })

describe('Delete round dialog', () => {
  it('loads the preview first, then shows what will happen', async () => {
    renderDialog()
    expect(screen.getByRole('alertdialog', { name: 'Delete “Alnwick Fri”?' })).toBeInTheDocument()
    expect(screen.getByText('Checking what this round affects…')).toBeInTheDocument()
    expect(deleteButton()).toBeDisabled()
    expect(
      await screen.findByText('3 properties will be unassigned and 5 upcoming visits removed. Completed visits are kept.'),
    ).toBeInTheDocument()
    expect(deleteButton()).toBeEnabled()
    expect(screen.queryByText(/earlier unfinished/)).not.toBeInTheDocument()
  })

  it('uses singular wording and mentions older unfinished visits kept as history', async () => {
    usePreview({ ...preview, propertyCount: 1, upcomingVisitCount: 1, detachedVisitCount: 2 })
    renderDialog()
    expect(
      await screen.findByText('1 property will be unassigned and 1 upcoming visit removed. Completed visits are kept.'),
    ).toBeInTheDocument()
    expect(screen.getByText('2 earlier unfinished visits stay in history without a round.')).toBeInTheDocument()
  })

  it('mentions a single older unfinished visit', async () => {
    usePreview({ ...preview, detachedVisitCount: 1 })
    renderDialog()
    expect(await screen.findByText('1 earlier unfinished visit stays in history without a round.')).toBeInTheDocument()
  })

  it('explains why a round with emergencies or visits with records can’t be deleted', async () => {
    usePreview({ ...preview, canDelete: false, emergencyCount: 2, attachedVisitCount: 4 })
    renderDialog()
    const reasons = await screen.findByRole('list', { name: 'Why this round can’t be deleted' })
    expect(within(reasons).getByText('This round has 2 open emergency reports.')).toBeInTheDocument()
    expect(
      within(reasons).getByText('4 upcoming visits already have invoices, payments, photos or issues.'),
    ).toBeInTheDocument()
    expect(deleteButton()).toBeDisabled()
  })

  it('uses singular reasons', async () => {
    usePreview({ ...preview, canDelete: false, emergencyCount: 1, attachedVisitCount: 1 })
    renderDialog()
    expect(await screen.findByText('This round has 1 open emergency report.')).toBeInTheDocument()
    expect(screen.getByText('1 upcoming visit already has an invoice, payment, photo or issue.')).toBeInTheDocument()
  })

  it('falls back to a general reason when the server gives none', async () => {
    usePreview({ ...preview, canDelete: false })
    renderDialog()
    expect(await screen.findByText('This round can’t be deleted right now.')).toBeInTheDocument()
    expect(deleteButton()).toBeDisabled()
  })

  it('deletes, toasts the result and tells the planner', async () => {
    const { user, onClose, onDeleted } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(deleteButton())
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('r1'))
    expect(onClose).toHaveBeenCalled()
    expect(deletes).toBe(1)
    expect(await screen.findByText('Round deleted')).toBeInTheDocument()
    expect(screen.getByText('Alnwick Fri: 3 properties unassigned, 5 upcoming visits removed.')).toBeInTheDocument()
  })

  it('handles a 409 race: shows why, rechecks and disables delete', async () => {
    usePreview(preview, { ...preview, canDelete: false, attachedVisitCount: 1 })
    server.use(
      http.delete(`${API}/rounds/r1`, () => apiError(409, 'Round has attached visits', 'ROUND_HAS_ATTACHED_VISITS')),
    )
    const { user, onClose, onDeleted } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(deleteButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some upcoming visits on this round now have invoices, payments, photos or issues, so it wasn’t deleted.',
    )
    expect(await screen.findByText('1 upcoming visit already has an invoice, payment, photo or issue.')).toBeInTheDocument()
    expect(deleteButton()).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('handles a 409 for emergencies raised meanwhile', async () => {
    usePreview(preview, { ...preview, canDelete: false, emergencyCount: 1 })
    server.use(http.delete(`${API}/rounds/r1`, () => apiError(409, 'Round has emergencies', 'ROUND_HAS_EMERGENCIES')))
    const { user } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(deleteButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This round now has open emergency reports, so it wasn’t deleted.',
    )
    expect(await screen.findByText('This round has 1 open emergency report.')).toBeInTheDocument()
  })

  it('shows the server message for any other failure and stays open', async () => {
    server.use(http.delete(`${API}/rounds/r1`, () => apiError(409, 'Operational day has already been closed')))
    const { user, onClose } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(deleteButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Operational day has already been closed')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes, toasts and refreshes when the round is already gone (404 on delete)', async () => {
    server.use(http.delete(`${API}/rounds/r1`, () => apiError(404, 'Round not found')))
    const { user, onClose, onDeleted } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(deleteButton())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onDeleted).toHaveBeenCalledWith('r1')
    expect(await screen.findByText('This round no longer exists.')).toBeInTheDocument()
  })

  it('closes the same way when the preview finds the round gone', async () => {
    server.use(http.get(`${API}/rounds/r1/delete-preview`, () => apiError(404, 'Round not found')))
    const { onClose, onDeleted } = renderDialog()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onDeleted).toHaveBeenCalledWith('r1')
    expect(await screen.findByText('This round no longer exists.')).toBeInTheDocument()
  })

  it('keeps delete off when the preview fails', async () => {
    server.use(http.get(`${API}/rounds/r1/delete-preview`, () => apiError(500, 'Boom')))
    renderDialog()
    expect(await screen.findByText(/Could not check what deleting this round would affect/)).toBeInTheDocument()
    expect(deleteButton()).toBeDisabled()
  })

  it('cancel closes without deleting', async () => {
    const { user, onClose } = renderDialog()
    await screen.findByText(/3 properties will be unassigned/)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(deletes).toBe(0)
  })

  it('renders nothing without a round', () => {
    renderWithProviders(<DeleteRoundDialog round={null} onClose={vi.fn()} onDeleted={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
