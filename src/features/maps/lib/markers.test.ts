import { describe, expect, it } from 'vitest'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import {
  DEFAULT_MAP_ID,
  MAX_FIT_ZOOM,
  escapeHtml,
  groupPoints,
  infoWindowHtml,
  mapId,
  pinLabel,
  pinTitle,
  stopStatus,
} from '@/features/maps/lib/markers'

function stop(visitId: string, overrides: Partial<PlannerListStop> = {}): PlannerListStop {
  return {
    visitId,
    propertyId: 'p',
    addressLine: `${visitId} High Street`,
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

const at = (lat: number, lng: number) => ({ lat, lng })

describe('map helpers (ACT-10, WEB-10, WEB-19)', () => {
  it('reads the map id from the environment, with a documented default', () => {
    expect(MAX_FIT_ZOOM).toBe(17)
    expect(mapId({ VITE_GOOGLE_MAPS_MAP_ID: ' abc123 ' })).toBe('abc123')
    expect(mapId({ VITE_GOOGLE_MAPS_MAP_ID: '  ' })).toBe(DEFAULT_MAP_ID)
    expect(mapId({})).toBe('DEMO_MAP_ID')
    expect(mapId()).toBe(mapId(import.meta.env))
  })

  it('classifies a stop with the legend priority', () => {
    expect(stopStatus(stop('a', { issues: [{ id: 'i', type: 'x' }], paymentHold: true }))).toBe('issue')
    expect(stopStatus(stop('a', { paymentHold: true }))).toBe('payment-hold')
    expect(stopStatus(stop('a', { status: 'COMPLETED' }))).toBe('completed')
    expect(stopStatus(stop('a'))).toBe('scheduled')
  })

  it('groups coincident stops into one pin with the most urgent status', () => {
    const groups = groupPoints([
      { stop: stop('a', { status: 'COMPLETED' }), point: at(55.00001, -1.6) },
      { stop: stop('b', { paymentHold: true }), point: at(55.00002, -1.60001) },
      { stop: stop('c', { locationApproximate: true }), point: at(56, -1.6) },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].stops.map((s) => s.visitId)).toEqual(['a', 'b'])
    expect(groups[0].status).toBe('payment-hold')
    expect(groups[0].approximate).toBe(false)
    expect(groups[1].approximate).toBe(true)
    expect(pinLabel(groups[0])).toBe('2')
    expect(pinLabel(groups[1])).toBe('')
    expect(pinTitle(groups[0])).toBe('2 stops at a High Street')
    expect(pinTitle(groups[1])).toBe('c High Street, Scheduled')
  })

  it('shows a glyph for non-default single statuses', () => {
    const [issue] = groupPoints([{ stop: stop('a', { issues: [{ id: 'i', type: 'x' }] }), point: at(1, 1) }])
    expect(pinLabel(issue)).toBe('!')
  })

  it('escapes html', () => {
    expect(escapeHtml('<b a="1">&\'')).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&#39;')
  })

  it('builds an escaped info window with round, technician, visit date, status and the approximate note', () => {
    const evil = stop('a', {
      addressLine: '<img src=x onerror=alert(1)>',
      technicianName: null,
      date: '2026-11-09',
      locationApproximate: true,
    })
    const html = infoWindowHtml(
      groupPoints([
        { stop: evil, point: at(1, 1) },
        { stop: stop('b', { issues: [{ id: 'i', type: 'x' }] }), point: at(1, 1) },
      ])[0],
      (value) => `£${value}`,
      (s) => `https://maps.example/?q=${s.visitId}&x="1"`,
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('2 stops at this pin')
    expect(html).toContain('Technician: Unassigned')
    expect(html).toContain('Technician: Sam')
    expect(html).toContain('Round: Friday round')
    expect(html).toContain('Visit: Mon 9 Nov')
    expect(html).toContain('Status: Issue')
    expect(html).toContain('Approximate location')
    expect(html).toContain('&quot;1&quot;')

    const plain = infoWindowHtml(groupPoints([{ stop: stop('z'), point: at(2, 2) }])[0], (v) => `£${v}`, () => '#')
    expect(plain).not.toContain('stops at this pin')
    expect(plain).not.toContain('Approximate location')
    expect(plain).not.toContain('Visit:')
  })
})
