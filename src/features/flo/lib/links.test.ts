import { describe, expect, it } from 'vitest'
import { floLinkTarget } from '@/features/flo/lib/links'

describe('floLinkTarget', () => {
  it('maps every screen of the closed enum to a route', () => {
    expect(floLinkTarget({ screen: 'TODAYS_WORK', params: { date: '2026-11-10', visitId: 'v1', round: 'r2' } })).toBe(
      '/todays-work?visitId=v1&round=r2&date=2026-11-10',
    )
    expect(floLinkTarget({ screen: 'ROUND', params: { roundId: 'r7' } })).toBe('/round-planner?round=r7')
    expect(floLinkTarget({ screen: 'ROUND' })).toBe('/round-planner')
    expect(floLinkTarget({ screen: 'CUSTOMERS' })).toBe('/customers')
    expect(floLinkTarget({ screen: 'DEBT_PAYMENT' })).toBe('/debt-payment')
    expect(floLinkTarget({ screen: 'REPORTS', params: { period: 'thisMonth' } })).toBe('/reports-history')
    expect(floLinkTarget({ screen: 'COMPLAINTS' })).toBe('/complaints')
    expect(floLinkTarget({ screen: 'TECHNICIANS' })).toBe('/technicians')
    expect(floLinkTarget({ screen: 'INVOICES' })).toBe('/invoices')
  })

  it('never follows a model-made URL, an unknown screen or a malformed id', () => {
    expect(floLinkTarget(undefined)).toBeNull()
    expect(floLinkTarget({ screen: 'https://evil.example' })).toBeNull()
    expect(floLinkTarget({ screen: 'SETTINGS' })).toBeNull()
    expect(floLinkTarget({ screen: 'ROUND', params: { roundId: 'https://evil.example/x' } })).toBe('/round-planner')
  })
})
