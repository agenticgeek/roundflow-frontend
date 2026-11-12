import { describe, expect, it } from 'vitest'
import { buildDeepLink, readDeepLink } from '@/lib/deep-link'

describe('deep links (Wave 1 open question)', () => {
  it('reads well-formed visitId, round and date', () => {
    expect(readDeepLink(new URLSearchParams('visitId=v_1&round=r-2&date=2026-11-06'))).toEqual({
      visitId: 'v_1',
      round: 'r-2',
      date: '2026-11-06',
    })
  })

  it('drops anything malformed or missing', () => {
    expect(readDeepLink(new URLSearchParams('visitId=<script>&round=a b&date=06/11/2026'))).toEqual({})
    expect(readDeepLink(new URLSearchParams(''))).toEqual({})
    expect(readDeepLink(new URLSearchParams(`round=${'x'.repeat(65)}`))).toEqual({})
  })

  it('builds links, leaving out empty values', () => {
    expect(buildDeepLink('/todays-work', { visitId: 'v1', round: 'r1', date: '2026-11-06' })).toBe(
      '/todays-work?visitId=v1&round=r1&date=2026-11-06',
    )
    expect(buildDeepLink('/round-planner', { round: 'r1' })).toBe('/round-planner?round=r1')
    expect(buildDeepLink('/todays-work', {})).toBe('/todays-work')
  })
})
