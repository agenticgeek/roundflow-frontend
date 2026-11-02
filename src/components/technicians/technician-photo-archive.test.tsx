import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import type { PhotoRow } from '@/api/photos.api'
import { TechniciansScreen } from '@/components/technicians/TechniciansScreen'
import { groupPhotosByVisit, groupReviewStatus } from '@/features/photos/lib/group'
import { setBootstrap } from '@/test/bootstrap'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { server } from '@/test/msw/server'
import { apiError, on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

vi.mock('@/components/chat/TechnicianChat', () => ({ TechnicianChat: () => <div>chat</div> }))

function photo(overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id: 'ph1',
    type: 'BEFORE',
    url: 'https://signed/ph1.jpg',
    thumbnailUrl: 'https://signed/ph1-thumb.jpg',
    takenAt: '2026-10-30T09:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-30T00:00:00Z',
    technician: { id: 't1', name: 'Sam' },
    reviewStatus: 'PENDING',
    jobRef: 'JOB-000123',
    propertyAddress: '12 Market Street',
    customerName: 'John Smith',
    ...overrides,
  }
}

const page = (rows: PhotoRow[], totalPages = 1) => ({
  rows,
  pagination: { page: 1, pageSize: 24, total: rows.length, totalPages },
})

const ROUTE = '/technicians/t1/conversation'

function serve(rows: PhotoRow[], seen: URLSearchParams[] = [], totalPages = 1) {
  server.use(
    on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
    on('get', '/technicians/{id}/photos', ({ request }) => {
      seen.push(new URL(request.url).searchParams)
      return specJson('/technicians/{id}/photos', 'get', 200, page(rows, totalPages))
    }),
  )
}

describe('Technician Photo Archive', () => {
  it('lists real visits with the technician’s name, address, customer and review state', async () => {
    serve([
      photo(),
      photo({ id: 'ph2', type: 'AFTER', reviewStatus: 'APPROVED' }),
      photo({ id: 'ph3', visitId: 'v2', propertyAddress: '8 Oak Lane', customerName: null, reviewStatus: 'APPROVED' }),
      photo({ id: 'ph4', visitId: 'v3', propertyAddress: null, url: null, thumbnailUrl: null, reviewStatus: 'REJECTED' }),
      photo({ id: 'ph5', visitId: null, type: 'PROPERTY' }),
    ])
    renderWithProviders(<TechniciansScreen />, { route: ROUTE })

    expect(await screen.findByText('Conversation with Sam')).toBeInTheDocument()
    expect(screen.getByText('Searchable gallery for Sam')).toBeInTheDocument()
    expect(await screen.findByText('12 Market Street')).toBeInTheDocument()
    expect(screen.getAllByText('JOB-000123 · John Smith · 30 Oct 2026').length).toBeGreaterThan(0)
    expect(screen.getByText('8 Oak Lane')).toBeInTheDocument()
    expect(screen.getByText('Visit')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.queryByText(/James/)).not.toBeInTheDocument()
  })

  it('searches the API with a debounced term and resets to page 1', async () => {
    const seen: URLSearchParams[] = []
    serve([photo()], seen, 2)
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(seen.at(-1)?.get('page')).toBe('2'))

    await user.type(screen.getByPlaceholderText('Search customer, address, job ref...'), 'oak')
    await waitFor(() => expect(seen.at(-1)?.get('search')).toBe('oak'))
    expect(seen.at(-1)?.get('page')).toBe('1')
    expect(seen.at(-1)?.get('pageSize')).toBe('10')
    expect(seen.filter((params) => params.get('search')).length).toBe(1) // typed in one debounced burst
  })

  it('shows empty states, errors with retry, and collapses the archive', async () => {
    let fail = true
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/technicians/{id}/photos', () => {
        if (fail) return apiError(500, 'Signing failed')
        return specJson('/technicians/{id}/photos', 'get', 200, page([]))
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    expect(await screen.findByText('Signing failed')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No photos yet.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search customer, address, job ref...'), 'zzz')
    expect(await screen.findByText('No photos match your search.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Collapse/ }))
    expect(screen.queryByText('Photo Archive', { selector: 'h2' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Photo Archive' }))
    expect(screen.getByText('Photo Archive', { selector: 'h2' })).toBeInTheDocument()
  })

  it('opens a visit’s photos from a card', async () => {
    serve([photo()])
    server.use(
      on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, page([photo()]))),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await user.click(await screen.findByText('12 Market Street'))
    expect(await screen.findByRole('button', { name: 'Open photo: Before' })).toBeInTheDocument()
  })

  it('Approve All approves exactly the pending photos in view, then refreshes', async () => {
    const bodies: unknown[] = []
    let approved = false
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/technicians/{id}/photos', () =>
        specJson(
          '/technicians/{id}/photos',
          'get',
          200,
          page([
            photo({ id: 'ph1', reviewStatus: approved ? 'APPROVED' : 'PENDING' }),
            photo({ id: 'ph2', type: 'AFTER', reviewStatus: approved ? 'APPROVED' : 'PENDING' }),
            photo({ id: 'ph3', visitId: 'v2', reviewStatus: 'APPROVED' }),
          ]),
        ),
      ),
      on('post', '/technicians/{id}/photos/approve', async ({ request }) => {
        bodies.push(await request.json())
        approved = true
        return specJson('/technicians/{id}/photos/approve', 'post', 200, { updated: 2 })
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findAllByText('12 Market Street')

    await user.click(screen.getByRole('button', { name: 'Approve All' }))
    expect(screen.getByText('This will mark 2 pending photos in the current view as approved.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Approve All' })[1]!)

    expect(await screen.findByText('2 photos approved.')).toBeInTheDocument()
    expect(bodies).toEqual([{ photoIds: ['ph1', 'ph2'] }])
    await waitFor(() => expect(screen.queryByText('Pending')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Approve All' })).toBeDisabled()
  })

  it('reports a failed approval and keeps the dialog open; 0 and 1 are worded correctly', async () => {
    let mode: 'fail' | 'none' | 'one' = 'fail'
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/technicians/{id}/photos', () => specJson('/technicians/{id}/photos', 'get', 200, page([photo()]))),
      on('post', '/technicians/{id}/photos/approve', () => {
        if (mode === 'fail') return apiError(500, 'Boom')
        return specJson('/technicians/{id}/photos/approve', 'post', 200, { updated: mode === 'one' ? 1 : 0 })
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')

    await user.click(screen.getByRole('button', { name: 'Approve All' }))
    expect(screen.getByText('This will mark 1 pending photo in the current view as approved.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Approve All' })[1]!)
    expect(await screen.findByText('Boom')).toBeInTheDocument()
    expect(screen.getAllByText('Approve All Photos?').length).toBeGreaterThan(0)

    mode = 'none'
    await user.click(screen.getAllByRole('button', { name: 'Approve All' })[1]!)
    expect(await screen.findByText('No pending photos to approve.')).toBeInTheDocument()

    mode = 'one'
    await user.click(screen.getByRole('button', { name: 'Approve All' }))
    await user.click(screen.getAllByRole('button', { name: 'Approve All' })[1]!)
    expect(await screen.findByText('1 photo approved.')).toBeInTheDocument()
  })

  it('cannot approve without write access', async () => {
    setBootstrap({ role: 'TECHNICIAN', canMutate: false })
    serve([photo()])
    renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')
    expect(screen.getByRole('button', { name: 'Approve All' })).toBeDisabled()
  })
})

describe('single approve / reject', () => {
  it('approves or rejects every photo of a visit from its card, then refetches', async () => {
    const calls: Array<{ id: string; status: unknown }> = []
    let fetches = 0
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/technicians/{id}/photos', () => {
        fetches += 1
        return specJson('/technicians/{id}/photos', 'get', 200, page([photo({ id: 'ph1' }), photo({ id: 'ph2', type: 'AFTER' })]))
      }),
      on('patch', '/technicians/{id}/photos/{photoId}/review', async ({ params, request }) => {
        calls.push({ id: String(params.photoId), status: ((await request.json()) as { status: unknown }).status })
        return specJson('/technicians/{id}/photos/{photoId}/review', 'patch', 200, {
          id: String(params.photoId),
          reviewStatus: 'APPROVED',
          reviewedAt: null,
        })
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')
    const before = fetches

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Visit photos approved.')).toBeInTheDocument()
    expect(calls).toEqual([
      { id: 'ph1', status: 'APPROVED' },
      { id: 'ph2', status: 'APPROVED' },
    ])
    await waitFor(() => expect(fetches).toBeGreaterThan(before))

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(await screen.findByText('Visit photos rejected.')).toBeInTheDocument()
    expect(calls.slice(2).map((call) => call.status)).toEqual(['REJECTED', 'REJECTED'])
  })

  it('hides Reject on rejected visits and reports failures', async () => {
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/technicians/{id}/photos', () =>
        specJson('/technicians/{id}/photos', 'get', 200, page([photo({ reviewStatus: 'REJECTED' })])),
      ),
      on('patch', '/technicians/{id}/photos/{photoId}/review', () => apiError(500, 'Nope')),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Nope')).toBeInTheDocument()
  })

  it('shows no actions on approved visits or without write access', async () => {
    serve([photo({ reviewStatus: 'APPROVED' })])
    const approved = renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    approved.unmount()

    setBootstrap({ role: 'TECHNICIAN', canMutate: false })
    serve([photo()])
    renderWithProviders(<TechniciansScreen />, { route: ROUTE })
    await screen.findByText('12 Market Street')
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('approves / rejects a single photo from the visit gallery lightbox', async () => {
    const calls: unknown[] = []
    let status: 'PENDING' | 'REJECTED' = 'PENDING'
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, page([photo({ reviewStatus: status })]))),
      on('patch', '/technicians/{id}/photos/{photoId}/review', async ({ params, request }) => {
        calls.push([params.photoId, ((await request.json()) as { status: string }).status])
        status = 'REJECTED'
        return specJson('/technicians/{id}/photos/{photoId}/review', 'patch', 200, { id: 'ph1', reviewStatus: 'REJECTED', reviewedAt: null })
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/photos/v1' })
    await user.click(await screen.findByRole('button', { name: 'Open photo: Before' }))
    expect(screen.getByText('Pending review')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(await screen.findByText('Photo rejected.')).toBeInTheDocument()
    expect(calls).toEqual([['ph1', 'REJECTED']])
    expect(await screen.findByText('Rejected')).toBeInTheDocument() // lightbox follows the refetched data
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('reports a failed single-photo review', async () => {
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, page([photo()]))),
      on('patch', '/technicians/{id}/photos/{photoId}/review', () => apiError(500, 'Nope')),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/photos/v1' })
    await user.click(await screen.findByRole('button', { name: 'Open photo: Before' }))
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(await screen.findByText('Nope')).toBeInTheDocument()
  })

  it('hides the lightbox actions without write access', async () => {
    setBootstrap({ role: 'TECHNICIAN', canMutate: false })
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/visits/{id}/photos', () => specJson('/visits/{id}/photos', 'get', 200, page([photo()]))),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/photos/v1' })
    await user.click(await screen.findByRole('button', { name: 'Open photo: Before' }))
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})

describe('photo group helpers', () => {
  it('derives a visit’s review state and carries the property details', () => {
    const [group] = groupPhotosByVisit([photo({ reviewStatus: 'APPROVED' }), photo({ id: 'b', type: 'AFTER', reviewStatus: 'APPROVED' })])
    expect(group).toMatchObject({ address: '12 Market Street', customerName: 'John Smith' })
    expect(groupReviewStatus(group!)).toBe('APPROVED')

    const [rejected] = groupPhotosByVisit([photo({ reviewStatus: 'APPROVED' }), photo({ id: 'b', reviewStatus: 'REJECTED' })])
    expect(groupReviewStatus(rejected!)).toBe('REJECTED')

    const [pending] = groupPhotosByVisit([photo({ reviewStatus: 'REJECTED' }), photo({ id: 'b', reviewStatus: 'PENDING' })])
    expect(groupReviewStatus(pending!)).toBe('PENDING')

    const [legacy] = groupPhotosByVisit([photo({ reviewStatus: undefined, propertyAddress: undefined, customerName: undefined })])
    expect(groupReviewStatus(legacy!)).toBe('APPROVED')
    expect(legacy).toMatchObject({ address: null, customerName: null })
  })
})
