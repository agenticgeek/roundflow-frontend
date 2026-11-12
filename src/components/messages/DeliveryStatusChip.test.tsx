import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeliveryStatusChip } from '@/components/messages/DeliveryStatusChip'

describe('DeliveryStatusChip', () => {
  it('renders the status as text (never colour only) with the error as a description', () => {
    render(<DeliveryStatusChip status="BOUNCED" error="Mailbox does not exist" />)
    expect(screen.getByText('Bounced')).toBeInTheDocument()
    expect(screen.getByText('Mailbox does not exist')).toBeInTheDocument()
  })

  it('renders each tone and nothing for a null status', () => {
    const { container, rerender } = render(<DeliveryStatusChip status="DELIVERED" />)
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    rerender(<DeliveryStatusChip status="SENT" />)
    expect(screen.getByText('Sent')).toBeInTheDocument()
    rerender(<DeliveryStatusChip status={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
