import { describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, within } from '@testing-library/react'
import { photosApi, type PhotoRow } from '@/api/photos.api'
import { PhotoGallery } from '@/components/photos/PhotoGallery'
import { TechnicianVisitPhotos } from '@/components/technicians/TechnicianPhotoGallery'
import { server } from '@/test/msw/server'
import { API, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const pagination = { page: 1, pageSize: 24, total: 3, totalPages: 1 }

function photo(id: string, reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED', type: 'BEFORE' | 'AFTER' = 'BEFORE'): PhotoRow {
  return {
    id,
    type,
    url: `https://signed/${id}.jpg`,
    thumbnailUrl: `https://signed/${id}.jpg`,
    takenAt: '2026-10-30T09:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-30T00:00:00Z',
    technician: { id: 't1', name: 'Sam' },
    reviewStatus,
  } as PhotoRow
}

const rows = [photo('p1', 'PENDING'), photo('p2', 'REJECTED'), photo('p3', 'APPROVED', 'AFTER')]

function visitPhotos() {
  return on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, { rows, pagination }))
}

async function openPhoto(user: ReturnType<typeof renderWithProviders>['user'], name: string) {
  await user.click((await screen.findAllByRole('button', { name }))[0])
  return screen.getByRole('dialog')
}

describe('photo review in the lightbox (GAP-019)', () => {
  it('shows each review state with only the actions that still apply, and toasts the outcome', async () => {
    const patched: string[] = []
    server.use(
      visitPhotos(),
      http.patch(`${API}/technicians/t1/photos/:photoId/review`, async ({ request, params }) => {
        const body = (await request.json()) as { status: string }
        patched.push(`${String(params.photoId)}:${body.status}`)
        return HttpResponse.json({ id: String(params.photoId), reviewStatus: body.status, reviewedAt: null })
      }),
    )
    const { user } = renderWithProviders(<TechnicianVisitPhotos technicianId="t1" technicianName="Sam" visitId="v1" canMutate onBack={vi.fn()} />)

    // Pending: approve and reject.
    let dialog = await openPhoto(user, 'Open photo: Before')
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }))
    expect(await screen.findByText('Photo rejected.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Photo approved.')).toBeInTheDocument()
    expect(patched).toEqual(['p1:REJECTED', 'p1:APPROVED'])

    // Rejected photo: no Reject button, can be approved. Approved photo: no Approve button.
    await user.click(within(dialog).getByRole('button', { name: 'Next photo' }))
    expect(within(dialog).getByText('Rejected')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Next photo' }))
    expect(within(dialog).getByText('Approved')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    dialog = screen.getByRole('dialog')
  })

  it('shows the server message when a review fails, and a fallback for a non-Error rejection', async () => {
    server.use(
      visitPhotos(),
      http.patch(`${API}/technicians/t1/photos/:photoId/review`, () => HttpResponse.json({ error: 'Review locked' }, { status: 409 })),
    )
    const { user } = renderWithProviders(<TechnicianVisitPhotos technicianId="t1" technicianName="Sam" visitId="v1" canMutate onBack={vi.fn()} />)
    const dialog = await openPhoto(user, 'Open photo: Before')
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Review locked')).toBeInTheDocument()

    vi.spyOn(photosApi, 'reviewTechnician').mockRejectedValueOnce('boom')
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Could not update the photo')).toBeInTheDocument()
  })
})

describe('PhotoGallery lightbox keeps a photo that drops out of the list', () => {
  it('falls back to the photo it opened with', async () => {
    const props = { isLoading: false, error: null, onRetry: vi.fn(), onPage: vi.fn() }
    const { user, rerender } = renderWithProviders(<PhotoGallery data={{ rows: [photo('p1', 'PENDING')], pagination }} {...props} />)
    await user.click(screen.getByRole('button', { name: 'Open photo: Before' }))
    rerender(<PhotoGallery data={{ rows: [photo('p9', 'PENDING', 'AFTER')], pagination }} {...props} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('1 of 1')
  })
})
