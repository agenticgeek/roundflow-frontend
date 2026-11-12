import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPinElement, createPin, fitBoundsCapped } from '@/features/maps/lib/gmaps'
import { groupPoints, type MapGroup } from '@/features/maps/lib/markers'
import { installFakeGoogle, type FakeGoogle } from '@/test/fake-google-maps'

let fake: FakeGoogle | null = null
afterEach(() => fake?.restore())

function group(count = 1, extra: Record<string, unknown> = {}): MapGroup {
  const stops = Array.from({ length: count }, (_, index) => ({
    visitId: `v${index}`,
    propertyId: 'p',
    addressLine: `${index} Road`,
    postcode: 'NE1',
    customerName: 'Jo',
    price: 1,
    status: 'SCHEDULED',
    paymentHold: false,
    issues: [],
    roundId: 'r',
    roundName: 'R',
    ...extra,
  }))
  return groupPoints(stops.map((stop) => ({ stop, point: { lat: 1, lng: 2 } })))[0]
}

function newMap() {
  return new google.maps.Map(document.createElement('div'))
}

describe('map pins (WEB-10, WEB-19)', () => {
  it('draws a round pin for one stop and a rounded square with the count for a group', () => {
    const single = buildPinElement(group(1, { paymentHold: true }))
    expect(single.textContent).toBe('£')
    expect(single.style.borderRadius).toBe('50%')
    const many = buildPinElement(group(3))
    expect(many.textContent).toBe('3')
    expect(many.style.borderRadius).toBe('6px')
  })

  it('uses AdvancedMarkerElement when the marker library is there', () => {
    fake = installFakeGoogle({ advanced: true })
    const onClick = vi.fn()
    const pin = createPin(newMap(), group(2), onClick)
    const marker = fake.pins[0]
    expect(marker.kind).toBe('advanced')
    expect(marker.options.gmpClickable).toBe(true)
    expect(marker.title).toBe('2 stops at 0 Road')
    marker.listeners.click()
    expect(onClick).toHaveBeenCalled()
    expect(pin.anchor).toBe(marker)

    pin.update(group(1))
    expect(marker.title).toBe('0 Road, Scheduled')
    expect((marker.content as HTMLElement).textContent).toBe('')
    pin.remove()
    expect(marker.removed).toBe(true)
  })

  it('falls back to the legacy Marker with a label', () => {
    fake = installFakeGoogle({ advanced: false })
    const pin = createPin(newMap(), group(2), vi.fn())
    const marker = fake.pins[0]
    expect(marker.kind).toBe('legacy')
    expect(marker.label).toMatchObject({ text: '2' })
    pin.update(group(1))
    expect(marker.label).toBeNull()
    expect(marker.title).toBe('0 Road, Scheduled')
    marker.listeners.click?.()
    pin.remove()
    expect(marker.removed).toBe(true)
  })

  it('caps the zoom after fitting, and leaves a lower zoom alone', () => {
    fake = installFakeGoogle({ zoomAfterFit: 21 })
    const map = newMap()
    const bounds = new google.maps.LatLngBounds()
    fitBoundsCapped(map, bounds)
    expect(map.fitBounds).toHaveBeenCalledWith(bounds, 48)
    fake.idleListeners[0]()
    expect(map.getZoom()).toBe(17)

    fake.restore()
    fake = installFakeGoogle({ zoomAfterFit: 12 })
    const second = newMap()
    fitBoundsCapped(second, new google.maps.LatLngBounds())
    fake.idleListeners[0]()
    expect(second.getZoom()).toBe(12)

    fake.restore()
    fake = installFakeGoogle()
    const third = newMap()
    fitBoundsCapped(third, new google.maps.LatLngBounds())
    fake.idleListeners[0]()
    expect(third.getZoom()).toBeUndefined()
  })
})
