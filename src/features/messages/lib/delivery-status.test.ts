import { describe, expect, it } from 'vitest'
import { deliveryStatusView } from '@/features/messages/lib/delivery-status'

describe('deliveryStatusView', () => {
  it('gives every status words, a symbol and a tone', () => {
    expect(deliveryStatusView('SENT')).toEqual({ label: 'Sent', symbol: '→', tone: 'neutral' })
    expect(deliveryStatusView('DELIVERED')).toEqual({ label: 'Delivered', symbol: '✓', tone: 'success' })
    expect(deliveryStatusView('BOUNCED')).toEqual({ label: 'Bounced', symbol: '✕', tone: 'danger' })
    expect(deliveryStatusView('COMPLAINED')).toEqual({ label: 'Reported as spam', symbol: '!', tone: 'danger' })
    expect(deliveryStatusView('FAILED')).toEqual({ label: 'Failed', symbol: '✕', tone: 'danger' })
  })

  it('shows nothing for SMS (null) and a readable label for an unknown status', () => {
    expect(deliveryStatusView(null)).toBeNull()
    expect(deliveryStatusView(undefined)).toBeNull()
    expect(deliveryStatusView('DEFERRED_LATER')).toEqual({ label: 'Deferred later', symbol: '?', tone: 'neutral' })
  })
})
