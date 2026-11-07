export type DeliveryTone = 'neutral' | 'success' | 'danger'

export type DeliveryStatusView = { label: string; symbol: string; tone: DeliveryTone }

const KNOWN: Record<string, DeliveryStatusView> = {
  SENT: { label: 'Sent', symbol: '→', tone: 'neutral' },
  DELIVERED: { label: 'Delivered', symbol: '✓', tone: 'success' },
  BOUNCED: { label: 'Bounced', symbol: '✕', tone: 'danger' },
  COMPLAINED: { label: 'Reported as spam', symbol: '!', tone: 'danger' },
  FAILED: { label: 'Failed', symbol: '✕', tone: 'danger' },
}

/** Words, a symbol and a tone for an email's `deliveryStatus`; `null` (SMS has none) shows nothing. */
export function deliveryStatusView(status: string | null | undefined): DeliveryStatusView | null {
  if (!status) return null
  const known = KNOWN[status]
  if (known) return known
  const words = status.toLowerCase().replace(/_/g, ' ')
  return { label: words.charAt(0).toUpperCase() + words.slice(1), symbol: '?', tone: 'neutral' }
}
