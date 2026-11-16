import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClosureWarning } from '@/features/closures/components/ClosureWarning'

const closure = {
  id: 'c1',
  label: 'Christmas',
  startDate: '2026-12-24',
  endDate: '2026-12-28',
}

describe('ClosureWarning', () => {
  it('renders nothing when there is nothing to warn about', () => {
    const { container } = render(<ClosureWarning />)
    expect(container).toBeEmptyDOMElement()
    const withNull = render(<ClosureWarning warnings={[]} closure={null} />)
    expect(withNull.container).toBeEmptyDOMElement()
  })

  it('announces a local closure as a status with the dates, and says the date can still be chosen', () => {
    render(<ClosureWarning closure={closure} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('This date is inside Christmas: Thu 24 Dec 2026 to Mon 28 Dec 2026.')
    expect(status).toHaveTextContent('You can still choose it.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows response warnings', () => {
    render(
      <ClosureWarning
        warnings={[{ code: 'DATE_IN_CLOSURE', closureId: 'c9', label: 'Staff holiday', startDate: '2027-01-04', endDate: '2027-01-05' }]}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('This date is inside Staff holiday: Mon 4 Jan 2027 to Tue 5 Jan 2027.')
  })

  it('does not repeat a closure that is both in the response and found locally', () => {
    render(
      <ClosureWarning
        warnings={[{ code: 'DATE_IN_CLOSURE', closureId: 'c1', label: 'Christmas', startDate: '2026-12-24', endDate: '2026-12-28' }]}
        closure={closure}
      />,
    )
    expect(screen.getAllByText(/Christmas/)).toHaveLength(1)
  })

  it('lists a different local closure as well as the response warning', () => {
    render(
      <ClosureWarning
        warnings={[{ code: 'DATE_IN_CLOSURE', closureId: 'c9', label: 'Other', startDate: '2026-12-24', endDate: '2026-12-25' }]}
        closure={closure}
      />,
    )
    expect(screen.getByText(/Other/)).toBeInTheDocument()
    expect(screen.getByText(/Christmas/)).toBeInTheDocument()
  })

  it('falls back to the short wording for a marker without dates', () => {
    render(<ClosureWarning closure={{ label: 'Christmas' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Closed: Christmas')
    // No id to match on, so two markers with the same label are still listed once each by position.
    render(<ClosureWarning closure={{ id: 'x', label: 'Other' }} warnings={[]} />)
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })
})
