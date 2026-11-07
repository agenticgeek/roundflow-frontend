import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { installFakeGoogle, type FakeGoogle } from '@/test/fake-google-maps'
import { renderWithProviders } from '@/test/render'

const mocks = vi.hoisted(() => ({
  result: { points: [] as unknown[], failed: [] as unknown[], loading: false, error: null as string | null, configured: true },
}))
vi.mock('@/features/maps/hooks/useGeocodedStops', () => ({ useGeocodedStops: () => mocks.result }))

const { GpsTrackingPanel } = await import('@/components/dashboard/GpsTrackingPanel')

const stop = {
  visitId: 'v1',
  propertyId: 'p',
  addressLine: '1 High Street',
  postcode: 'NE1',
  customerName: 'Jo',
  price: 20,
  status: 'SCHEDULED',
  paymentHold: false,
  issues: [],
  technicianName: 'Sam',
  roundId: 'r',
  roundName: 'Round',
} as PlannerListStop

let fake: FakeGoogle | null = null
afterEach(() => fake?.restore())

describe('GpsTrackingPanel map (WEB-10)', () => {
  it('draws its pins with the shared map canvas', () => {
    fake = installFakeGoogle()
    mocks.result = { points: [{ stop, point: { lat: 55, lng: -1.6 } }], failed: [], loading: false, error: null, configured: true }
    renderWithProviders(<GpsTrackingPanel stops={[stop]} loading={false} selectedTechnician={null} onSelectTechnician={vi.fn()} />)
    expect(fake.pins).toHaveLength(1)
    expect(fake.maps[0].options.mapId).toBe('DEMO_MAP_ID')
  })
})
