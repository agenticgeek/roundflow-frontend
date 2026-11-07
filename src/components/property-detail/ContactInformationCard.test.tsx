import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactInformationCard } from '@/components/property-detail/PropertyDetailScreen'
import type { PropertyDetailRecord } from '@/content/property-detail'

const property = { customerName: 'Jo Coates', phone: '07123 456 789', landline: '01665 510 000', email: 'jo@example.com' } as PropertyDetailRecord

describe('ContactInformationCard call links', () => {
  it('always offers tel: links for the mobile and the landline, named for the person being called', () => {
    render(<ContactInformationCard property={property} />)
    expect(screen.getByRole('link', { name: 'Call Jo Coates on 07123 456 789' })).toHaveAttribute('href', 'tel:07123456789')
    expect(screen.getByRole('link', { name: 'Call Jo Coates on 01665 510 000 (landline)' })).toHaveAttribute('href', 'tel:01665510000')
  })

  it('shows a dash, not a dead link, when there is no number', () => {
    render(<ContactInformationCard property={{ ...property, phone: ' ', landline: '' }} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })
})
