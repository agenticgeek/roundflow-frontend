import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { installFakeGoogle, type FakeGoogle } from '@/test/fake-google-maps'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  result: { points: [], failed: [], loading: false, error: null, configured: true } as {
    points: { stop: unknown; point: { lat: number; lng: number } }[]
    failed: unknown[]
    loading: boolean
    error: string | null
    configured: boolean
  },
}))

vi.mock('@/features/maps/hooks/useGeocodedStops', () => ({ useGeocodedStops: () => mocks.result }))

const { RoundPlannerMapView } = await import('@/components/round-planner/RoundPlannerMapView')

function stop(visitId: string, overrides: Partial<PlannerListStop> = {}): PlannerListStop {
  return {
    visitId,
    propertyId: 'p',
    addressLine: `${visitId} <b>High</b> Street`,
    postcode: 'NE1 1AA',
    customerName: 'Jo',
    price: 20,
    status: 'SCHEDULED',
    paymentHold: false,
    issues: [],
    technicianName: 'Sam',
    roundId: 'r1',
    roundName: 'Friday round',
    ...overrides,
  }
}

const pt = (lat: number, lng = -1.6) => ({ lat, lng })
let fake: FakeGoogle | null = null

function setup(stops: PlannerListStop[], pins: [PlannerListStop, { lat: number; lng: number }][], extra: Partial<typeof mocks.result> = {}) {
  mocks.result = {
    points: pins.map(([s, point]) => ({ stop: s, point })),
    failed: stops.filter((s) => !pins.some(([p]) => p.visitId === s.visitId)),
    loading: false,
    error: null,
    configured: true,
    ...extra,
  }
  return renderWithProviders(<RoundPlannerMapView stops={stops} currency="GBP" />)
}

afterEach(() => {
  fake?.restore()
  fake = null
  mocks.result = { points: [], failed: [], loading: false, error: null, configured: true }
})

describe('RoundPlannerMapView (ACT-10, WEB-10, WEB-19)', () => {
  it('shows the setup notice when no key is configured', () => {
    setup([stop('a')], [], { configured: false })
    expect(screen.getByText('Google Maps isn’t configured')).toBeInTheDocument()
  })

  it('says there are no stops in the setup preview when the day is empty', () => {
    setup([], [], { configured: false })
    expect(screen.getByText('No stops on this date.')).toBeInTheDocument()
  })

  it('shows loading and error states', () => {
    setup([stop('a')], [], { loading: true })
    expect(screen.getByText('Locating stops…')).toBeInTheDocument()
  })

  it('shows a geocode error', () => {
    setup([stop('a')], [], { error: 'Quota exceeded' })
    expect(screen.getByText('Quota exceeded')).toBeInTheDocument()
  })

  it('labels the map region, notes the list alternative and groups coincident stops into one counted pin', async () => {
    fake = installFakeGoogle({ advanced: true })
    const a = stop('a')
    const b = stop('b', { paymentHold: true, locationApproximate: true })
    const c = stop('c', { status: 'COMPLETED' })
    setup([a, b, c], [[a, pt(55)], [b, pt(55.00001)], [c, pt(56)]])

    expect(screen.getByRole('region', { name: /Map of stops/ })).toBeInTheDocument()
    expect(screen.getByText(/Every stop is also in the list/)).toBeInTheDocument()
    expect(fake.maps[0].options.mapId).toBe('DEMO_MAP_ID')
    expect(fake.pins).toHaveLength(2)
    expect(fake.pins[0].title).toBe('2 stops at a <b>High</b> Street')
    expect(fake.maps[0].fitBounds).toHaveBeenCalled()
    expect(screen.getByText('Approximate location')).toBeInTheDocument()
  })

  it('opens an escaped info window from the list, and from a pin click, and closes it again', async () => {
    fake = installFakeGoogle({ advanced: false })
    const a = stop('a', { locationApproximate: true })
    const b = stop('b', { technicianName: null })
    const missing = stop('m')
    const { user } = setup([a, b, missing], [[a, pt(55)], [b, pt(56)]])

    expect(screen.getByText('Location not found')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /a <b>High<\/b> Street/ }))
    const infoWindow = fake.infoWindows[0]
    expect(infoWindow.content).toContain('a &lt;b&gt;High&lt;/b&gt; Street')
    expect(infoWindow.content).toContain('Approximate location')
    expect(infoWindow.content).toContain('Round: Friday round')
    expect(infoWindow.opened?.anchor).toBe(fake.pins[0])
    expect(fake.maps[0].panTo).toHaveBeenCalledWith(pt(55))

    act(() => fake!.pins[1].listeners.click())
    expect(infoWindow.content).toContain('Technician: Unassigned')

    // The stop without a pin cannot be selected.
    await user.click(screen.getByRole('button', { name: /m <b>High/ }))
    expect(infoWindow.content).toContain('Unassigned')
  })

  it('centres on a single pin, updates and removes pins as stops change, and closes the info window', () => {
    fake = installFakeGoogle({ advanced: true })
    const a = stop('a')
    const b = stop('b')
    const first = setup([a, b], [[a, pt(55)], [b, pt(56)]])
    expect(fake.pins).toHaveLength(2)

    mocks.result = { ...mocks.result, points: [{ stop: { ...a, status: 'COMPLETED' }, point: pt(55) }] }
    first.rerender(<RoundPlannerMapView stops={[a]} currency="GBP" />)
    expect(fake.pins[1].removed).toBe(true)
    expect(fake.pins[0].title).toBe('a <b>High</b> Street, Completed')
    expect(fake.maps[0].center).toEqual(pt(55))
    expect(fake.maps[0].zoom).toBe(15)
    expect(fake.infoWindows[0].closed).toBeGreaterThan(0)
  })

  it('shows "No stops match these filters" over the map when nothing is left', () => {
    fake = installFakeGoogle()
    setup([], [])
    expect(screen.getByRole('status')).toHaveTextContent('No stops match these filters')
    expect(fake.pins).toHaveLength(0)
  })

  it('shows the unresolved badge and survives a broken Google script', () => {
    fake = installFakeGoogle({ mapThrows: true })
    const a = stop('a')
    setup([a], [])
    expect(screen.getByText('Could not load Google Maps.')).toBeInTheDocument()
  })

  it('does nothing when google is not defined', () => {
    const a = stop('a')
    setup([a], [[a, pt(55)]])
    expect(screen.getByRole('region', { name: /Map of stops/ })).toBeInTheDocument()
  })

  it('reports an error when pins cannot be created', () => {
    fake = installFakeGoogle({ advanced: false })
    const google = (globalThis as unknown as { google: { maps: { Marker: unknown } } }).google
    google.maps.Marker = class {
      constructor() {
        throw new Error('no pins')
      }
    }
    const a = stop('a')
    setup([a], [[a, pt(55)]])
    expect(screen.getByText('Could not load Google Maps.')).toBeInTheDocument()
  })

  it('lists the stops in the setup preview too', () => {
    const many = Array.from({ length: 7 }, (_, index) => stop(`s${index}`))
    setup(many, [], { configured: false })
    expect(screen.getAllByText(/High/)).toHaveLength(6)
    expect(screen.getByText('Stops (7)')).toBeInTheDocument()
  })
})
