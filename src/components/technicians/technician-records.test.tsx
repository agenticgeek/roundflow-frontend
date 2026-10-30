import { describe, expect, it, vi } from 'vitest'
import { HttpResponse } from 'msw'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { technicianRecordsApi, type TechnicianPerformance } from '@/api/technician-records.api'
import { RecordIncidentModal } from '@/components/technicians/RecordIncidentModal'
import { ReplaceTechnicianModal } from '@/components/technicians/ReplaceTechnicianModal'
import { TechnicianAvailabilityPanel } from '@/components/technicians/TechnicianAvailabilityPanel'
import { TechnicianIncidentsPanel } from '@/components/technicians/TechnicianIncidentsPanel'
import { TechnicianPerformanceCard } from '@/components/technicians/TechnicianPerformanceCard'
import { TechnicianPhotoGallery, TechnicianVisitPhotos } from '@/components/technicians/TechnicianPhotoGallery'
import { TechniciansScreen } from '@/components/technicians/TechniciansScreen'
import {
  formatAvailabilityRange,
  formatMinutes,
  formatMoneyOrDash,
  replacementOptions,
} from '@/features/technicians/lib/records'
import { queryKeys } from '@/lib/query-keys'
import { todayIso } from '@/lib/round-dates'
import { technicianListItem } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { renderWithProviders } from '@/test/render'

const pagination = { page: 1, pageSize: 24, total: 1, totalPages: 1 }

function performance(overrides: Partial<TechnicianPerformance> = {}): TechnicianPerformance {
  return {
    technicianId: 't1',
    period: 'thisMonth',
    from: '2026-10-01T00:00:00Z',
    to: '2026-11-01T00:00:00Z',
    visitsCompleted: 42,
    revenue: 840,
    timeOnJobMinutes: 125,
    revenuePerHour: 32.5,
    strikes: 1,
    damages: 0,
    upsells: 2,
    upsellValue: 30,
    complaints: 3,
    ...overrides,
  }
}

const incident = {
  id: 'i1',
  technicianId: 't1',
  visitId: null,
  type: 'DAMAGE' as const,
  amount: 12.5,
  note: 'Cracked pane',
  createdById: null,
  createdAt: '2026-10-29T10:00:00Z',
}

const window1 = { id: 'a1', technicianId: 't1', from: '2026-11-02T00:00:00Z', to: '2026-11-06T00:00:00Z', reason: 'Holiday' as string | null }

describe('technician records API', () => {
  it('hits every endpoint with the right method and body', async () => {
    const seen: unknown[] = []
    server.use(
      on('get', '/technicians/{id}/performance', ({ request }) => {
        seen.push(new URL(request.url).search)
        return specJson('/technicians/{id}/performance', 'get', 200, performance())
      }),
      on('get', '/technicians/{id}/incidents', ({ request }) => {
        seen.push(new URL(request.url).search)
        return specJson('/technicians/{id}/incidents', 'get', 200, { rows: [], pagination })
      }),
      on('post', '/technicians/{id}/incidents', async ({ request }) => {
        seen.push(await request.json())
        return specJson('/technicians/{id}/incidents', 'post', 201, incident)
      }),
      on('delete', '/technician-incidents/{id}', ({ params }) => {
        seen.push(`delete ${String(params.id)}`)
        return new HttpResponse(null, { status: 204 })
      }),
      on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, [window1])),
      on('post', '/technicians/{id}/availability', async ({ request }) => {
        seen.push(await request.json())
        return specJson('/technicians/{id}/availability', 'post', 201, { ...window1, visitsRestamped: 3 })
      }),
      on('delete', '/technicians/{id}/availability/{availabilityId}', ({ params }) => {
        seen.push(`remove ${String(params.availabilityId)}`)
        return new HttpResponse(null, { status: 204 })
      }),
      on('post', '/technicians/{id}/replace', async ({ request }) => {
        seen.push(await request.json())
        return specJson('/technicians/{id}/replace', 'post', 200, { visitsReassigned: 14 })
      }),
    )
    expect((await technicianRecordsApi.performance('t1', 'last30')).visitsCompleted).toBe(42)
    await technicianRecordsApi.incidents('t1', { type: 'STRIKE', page: 2 })
    await technicianRecordsApi.incidents('t1')
    await technicianRecordsApi.recordIncident('t1', { type: 'DAMAGE', note: 'x', amount: 5 })
    await technicianRecordsApi.deleteIncident('i1')
    expect(await technicianRecordsApi.availability('t1')).toHaveLength(1)
    expect((await technicianRecordsApi.addAvailability('t1', { from: '2026-11-02', to: '2026-11-06' })).visitsRestamped).toBe(3)
    await technicianRecordsApi.removeAvailability('t1', 'a1')
    expect((await technicianRecordsApi.replace('t1', { replacementTechnicianId: 't2', from: '2026-11-02' })).visitsReassigned).toBe(14)
    expect(seen).toEqual([
      '?period=last30',
      '?type=STRIKE&page=2',
      '',
      { type: 'DAMAGE', note: 'x', amount: 5 },
      'delete i1',
      { from: '2026-11-02', to: '2026-11-06' },
      'remove a1',
      { replacementTechnicianId: 't2', from: '2026-11-02' },
    ])
  })
})

describe('technician records formatting', () => {
  it('formats minutes, money and ranges', () => {
    expect(formatMinutes(null)).toBe('—')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(125)).toBe('2h 05m')
    expect(formatMoneyOrDash(null)).toBe('—')
    expect(formatMoneyOrDash(32.5)).toBe('£32.50')
    expect(formatAvailabilityRange(window1)).toBe('2 Nov 2026 – 6 Nov 2026')
    expect(formatAvailabilityRange({ from: '2026-11-02', to: '2099-12-31T00:00:00Z' })).toBe('2 Nov 2026 – until further notice')
  })

  it('offers only other active technicians as replacements', () => {
    expect(replacementOptions(undefined, 't1')).toEqual([])
    expect(
      replacementOptions(
        [
          technicianListItem({ id: 't1' }),
          technicianListItem({ id: 't2', name: null }),
          technicianListItem({ id: 't3', appStatus: 'PENDING_INVITE' }),
          technicianListItem({ id: 't4', active: false }),
        ],
        't1',
      ),
    ).toEqual([{ value: 't2', label: 'Unnamed technician' }])
  })
})

describe('TechnicianPerformanceCard (GAP-030)', () => {
  it('shows metrics, switches period, and "—" for untimed visits', async () => {
    server.use(
      on('get', '/technicians/{id}/performance', ({ request }) => {
        const period = new URL(request.url).searchParams.get('period')
        return specJson(
          '/technicians/{id}/performance',
          'get',
          200,
          period === 'lastMonth' ? performance({ timeOnJobMinutes: null, revenuePerHour: null }) : performance(),
        )
      }),
    )
    const { user } = renderWithProviders(<TechnicianPerformanceCard technicianId="t1" />)
    expect(screen.getByText('Loading performance…')).toBeInTheDocument()
    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('2h 05m')).toBeInTheDocument()
    expect(screen.getByText('£32.50')).toBeInTheDocument()
    expect(screen.queryByText(/means no completed visit/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Period' }))
    await user.click(screen.getByRole('option', { name: 'Last month' }))
    expect(await screen.findByText(/means no completed visit/)).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('shows the server error', async () => {
    server.use(on('get', '/technicians/{id}/performance', () => apiError(404, 'Technician not found')))
    renderWithProviders(<TechnicianPerformanceCard technicianId="t1" />)
    expect(await screen.findByText('Technician not found')).toBeInTheDocument()
  })
})

describe('TechnicianAvailabilityPanel (GAP-030)', () => {
  it('lists, adds and removes time off', async () => {
    let windows = [window1]
    let posted: unknown
    server.use(
      on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, windows)),
      on('post', '/technicians/{id}/availability', async ({ request }) => {
        posted = await request.json()
        windows = [...windows, { ...window1, id: 'a2', reason: null, to: '2099-12-31T00:00:00Z' }]
        return specJson('/technicians/{id}/availability', 'post', 201, { ...window1, visitsRestamped: 4 })
      }),
      on('delete', '/technicians/{id}/availability/{availabilityId}', () => new HttpResponse(null, { status: 204 })),
    )
    const { user, queryClient } = renderWithProviders(
      <TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByText('Loading availability…')).toBeInTheDocument()
    expect(await screen.findByText('2 Nov 2026 – 6 Nov 2026')).toBeInTheDocument()
    expect(screen.getByText('· Holiday')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add time off' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Pick a from and to date.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-09' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-10' } })
    await user.type(screen.getByLabelText('Reason'), ' Course ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Time off saved · 4 visits restamped')).toBeInTheDocument()
    expect(posted).toEqual({ from: '2026-11-09', to: '2026-11-10', reason: 'Course' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.today.all })
    expect(await screen.findByText('2 Nov 2026 – until further notice')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove time off 2 Nov 2026 – 6 Nov 2026' }))
    expect(await screen.findByText('Time off removed')).toBeInTheDocument()
  })

  it('shows add / remove errors, and cancels the form', async () => {
    server.use(
      on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, [window1])),
      on('post', '/technicians/{id}/availability', () => apiError(400, '`to` must not be before `from`')),
      on('delete', '/technicians/{id}/availability/{availabilityId}', () => apiError(404, 'Window not found')),
    )
    const { user } = renderWithProviders(
      <TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate />,
    )
    await user.click(await screen.findByRole('button', { name: 'Add time off' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-09' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-01' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('`to` must not be before `from`')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Remove time off/ }))
    expect(await screen.findByText('Window not found')).toBeInTheDocument()
  })

  it('read-only: empty and error states, no actions', async () => {
    server.use(on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, [])))
    const { unmount } = renderWithProviders(
      <TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate={false} />,
    )
    expect(await screen.findByText('No time off recorded.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add time off' })).not.toBeInTheDocument()
    unmount()

    server.use(on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, [window1])))
    const second = renderWithProviders(
      <TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate={false} />,
    )
    expect(await screen.findByText('2 Nov 2026 – 6 Nov 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    second.unmount()

    server.use(on('get', '/technicians/{id}/availability', () => apiError(403, 'Forbidden')))
    renderWithProviders(<TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate={false} />)
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
  })

  it('opens and closes the Replace technician modal', async () => {
    server.use(on('get', '/technicians/{id}/availability', () => specJson('/technicians/{id}/availability', 'get', 200, [])))
    const { user } = renderWithProviders(
      <TechnicianAvailabilityPanel technicianId="t1" technicianName="Sam" canMutate />,
    )
    await user.click(screen.getByRole('button', { name: 'Replace technician' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Hand Sam’s scheduled visits')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ReplaceTechnicianModal (GAP-030)', () => {
  it('reassigns visits to the chosen technician', async () => {
    let body: unknown
    const hold = gate()
    server.use(
      on('get', '/technicians', () =>
        specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1' }), technicianFixture({ id: 't2', name: 'Alex' })]),
      ),
      on('post', '/technicians/{id}/replace', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return specJson('/technicians/{id}/replace', 'post', 200, { visitsReassigned: 14 })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<ReplaceTechnicianModal technicianId="t1" technicianName="Sam" onClose={onClose} />)
    expect(screen.getByLabelText('From')).toHaveValue(todayIso())
    expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Replacement' }))
    await user.click(await screen.findByRole('option', { name: 'Alex' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-02' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-06' } })
    await user.click(screen.getByRole('switch', { name: 'Notify the replacement' }))
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    expect(await screen.findByText('Replacing…')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    hold.release()
    expect(await screen.findByText('14 visits reassigned')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ replacementTechnicianId: 't2', from: '2026-11-02', to: '2026-11-06', notify: false })
  })

  it('sends an open-ended replacement and shows the server error', async () => {
    let body: unknown
    server.use(
      on('get', '/technicians', () =>
        specJson('/technicians', 'get', 200, [technicianFixture({ id: 't2', name: 'Alex' })]),
      ),
      on('post', '/technicians/{id}/replace', async ({ request }) => {
        body = await request.json()
        return apiError(400, 'Replacement is inactive')
      }),
    )
    const { user } = renderWithProviders(<ReplaceTechnicianModal technicianId="t1" technicianName="Sam" onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Replacement' }))
    await user.click(await screen.findByRole('option', { name: 'Alex' }))
    await user.click(screen.getByRole('button', { name: 'Replace' }))
    expect(await screen.findByText('Replacement is inactive')).toBeInTheDocument()
    expect(body).toEqual({ replacementTechnicianId: 't2', from: todayIso(), to: null, notify: true })
  })

  it('explains when nobody can take over', async () => {
    server.use(on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1' })])))
    renderWithProviders(<ReplaceTechnicianModal technicianId="t1" technicianName="Sam" onClose={vi.fn()} />)
    expect(await screen.findByText('No other active technicians to hand over to.')).toBeInTheDocument()
  })
})

describe('incidents (GAP-025)', () => {
  it('records an incident with amount and visit', async () => {
    let body: unknown
    const hold = gate()
    server.use(
      on('post', '/technicians/{id}/incidents', async ({ request }) => {
        body = await request.json()
        await hold.wait()
        return specJson('/technicians/{id}/incidents', 'post', 201, incident)
      }),
    )
    const onClose = vi.fn()
    const { user, queryClient } = renderWithProviders(<RecordIncidentModal technicianId="t1" onClose={onClose} />)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Type' }))
    await user.click(screen.getByRole('option', { name: 'Damage' }))
    fireEvent.change(screen.getByLabelText('Amount (£)'), { target: { value: '-1' } })
    expect(screen.getByText('Enter a positive amount.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Amount (£)'), { target: { value: '12.5' } })
    await user.type(screen.getByLabelText('Note'), ' Cracked pane ')
    await user.type(screen.getByLabelText('Visit ID'), 'v1')
    await user.click(screen.getByRole('button', { name: 'Record' }))
    expect(await screen.findByText('Saving…')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    hold.release()
    expect(await screen.findByText('Damage recorded')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ type: 'DAMAGE', note: 'Cracked pane', amount: 12.5, visitId: 'v1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.technicians.incidents('t1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all })
  })

  it('shows the server error (e.g. unknown visit)', async () => {
    let body: unknown
    server.use(
      on('post', '/technicians/{id}/incidents', async ({ request }) => {
        body = await request.json()
        return apiError(404, 'Visit not found')
      }),
    )
    const { user } = renderWithProviders(<RecordIncidentModal technicianId="t1" onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Note'), 'Late')
    await user.click(screen.getByRole('button', { name: 'Record' }))
    expect(await screen.findByText('Visit not found')).toBeInTheDocument()
    expect(body).toEqual({ type: 'STRIKE', note: 'Late', amount: null, visitId: null })
  })

  it('panel lists, deletes and opens the record modal', async () => {
    let rows = [incident, { ...incident, id: 'i2', type: 'UPSELL' as const, amount: null, note: null }]
    server.use(
      on('get', '/technicians/{id}/incidents', () => specJson('/technicians/{id}/incidents', 'get', 200, { rows, pagination })),
      on('delete', '/technician-incidents/{id}', ({ params }) => {
        if (params.id === 'i2') return apiError(404, 'Incident not found')
        rows = rows.filter((row) => row.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<TechnicianIncidentsPanel technicianId="t1" canMutate />)
    expect(screen.getByText('Loading incidents…')).toBeInTheDocument()
    expect(await screen.findByText('Cracked pane')).toBeInTheDocument()
    expect(screen.getByText('· £12.50')).toBeInTheDocument()
    expect(screen.getByText('Upsell')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete incident Upsell' }))
    expect(await screen.findByText('Incident not found')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete incident Cracked pane' }))
    expect(await screen.findByText('Incident deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Cracked pane')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Record incident' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('panel read-only, empty and error states', async () => {
    server.use(on('get', '/technicians/{id}/incidents', () => specJson('/technicians/{id}/incidents', 'get', 200, { rows: [incident], pagination })))
    const first = renderWithProviders(<TechnicianIncidentsPanel technicianId="t1" canMutate={false} />)
    expect(await screen.findByText('Cracked pane')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record incident' })).not.toBeInTheDocument()
    first.unmount()

    server.use(on('get', '/technicians/{id}/incidents', () => specJson('/technicians/{id}/incidents', 'get', 200, { rows: [], pagination })))
    const second = renderWithProviders(<TechnicianIncidentsPanel technicianId="t1" canMutate />)
    expect(await screen.findByText('No incidents recorded.')).toBeInTheDocument()
    second.unmount()

    server.use(on('get', '/technicians/{id}/incidents', () => apiError(400, 'Bad type')))
    renderWithProviders(<TechnicianIncidentsPanel technicianId="t1" canMutate />)
    expect(await screen.findByText('Bad type')).toBeInTheDocument()
  })
})

describe('technician photos (GAP-019)', () => {
  const photo = {
    id: 'ph1',
    type: 'BEFORE' as const,
    url: 'https://signed/ph1.jpg',
    thumbnailUrl: 'https://signed/ph1.jpg',
    takenAt: '2026-10-30T09:00:00Z',
    visitId: 'v1',
    visitDate: '2026-10-30T00:00:00Z',
    technician: { id: 't1', name: 'Sam' },
  }

  it('technician gallery pages through photos and retries', async () => {
    const pages: string[] = []
    let fail = true
    server.use(
      on('get', '/technicians/{id}/photos', ({ request }) => {
        if (fail) return apiError(500, 'Signing failed')
        pages.push(new URL(request.url).searchParams.get('page') ?? '')
        return specJson('/technicians/{id}/photos', 'get', 200, {
          rows: [photo],
          pagination: { page: 1, pageSize: 24, total: 30, totalPages: 2 },
        })
      }),
    )
    const { user } = renderWithProviders(<TechnicianPhotoGallery technicianId="t1" />)
    expect(await screen.findByText('Signing failed')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Open photo: Before' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(pages).toEqual(['1', '2']))
  })

  it('visit photos view shows one visit and goes back', async () => {
    server.use(
      on('get', '/visits/{id}/photos', () =>
        specJson('/visits/{id}/photos', 'get', 200, { rows: [photo], pagination: { ...pagination, totalPages: 2 } }),
      ),
    )
    const onBack = vi.fn()
    const { user } = renderWithProviders(<TechnicianVisitPhotos technicianName="Sam" visitId="v1" onBack={onBack} />)
    expect(await screen.findByRole('button', { name: 'Open photo: Before' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: /Back to Sam/ }))
    expect(onBack).toHaveBeenCalled()
  })

  it('visit photos retry after an error', async () => {
    let calls = 0
    server.use(
      on('get', '/visits/{id}/photos', () => {
        calls += 1
        return apiError(404, 'Visit not found')
      }),
    )
    const { user } = renderWithProviders(<TechnicianVisitPhotos technicianName="Sam" visitId="v1" onBack={vi.fn()} />)
    expect(await screen.findByText('Visit not found')).toBeInTheDocument()
    await act(() => user.click(screen.getByRole('button', { name: 'Retry' })))
    await waitFor(() => expect(calls).toBe(2))
  })
})

describe('TechniciansScreen photos route (GAP-019)', () => {
  it('shows one visit’s photos and goes back to the technician', async () => {
    server.use(
      on('get', '/technicians', () => specJson('/technicians', 'get', 200, [technicianFixture({ id: 't1', name: 'Sam' })])),
      on('get', '/visits/{id}/photos', () =>
        specJson('/visits/{id}/photos', 'get', 200, { rows: [], pagination: { page: 1, pageSize: 24, total: 0, totalPages: 0 } }),
      ),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/photos/v1' })
    await user.click(await screen.findByRole('button', { name: 'Back to Sam' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Back to Sam' })).not.toBeInTheDocument())
  })
})
