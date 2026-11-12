import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AssignmentResultSummary } from '@/components/round-planner/AssignmentResultSummary'
import {
  hasNoVisits,
  outcomeLines,
  outcomesToastDescription,
  outcomeWarning,
  toAssignmentOutcome,
  type AssignmentOutcome,
} from '@/features/rounds/lib/assignment-result'

const base: AssignmentOutcome = {
  roundId: 'r1', roundName: 'Alnwick Fri', visitsUpdated: 0, visitsGenerated: 0, overriddenVisits: 0, nextVisitDate: null,
}

describe('assignment result (FLOW-02)', () => {
  it('reads the response fields and defaults them for an older backend', () => {
    const full = toAssignmentOutcome(
      { id: 'r1', name: 'Alnwick Fri' },
      { roundId: 'r1', allocation: [], visitsUpdated: 2, visitsGenerated: 3, overriddenVisits: 1, nextVisitDate: '2026-11-09' },
    )
    expect(full).toEqual({ ...base, visitsUpdated: 2, visitsGenerated: 3, overriddenVisits: 1, nextVisitDate: '2026-11-09' })
    const older = { roundId: 'r1', allocation: [], visitsUpdated: 5 } as unknown as Parameters<typeof toAssignmentOutcome>[1]
    expect(toAssignmentOutcome({ id: 'r1', name: 'Alnwick Fri' }, older)).toEqual({ ...base, visitsUpdated: 5 })
  })

  it('warns only when nothing was updated or generated', () => {
    expect(hasNoVisits(base)).toBe(true)
    expect(hasNoVisits({ ...base, visitsUpdated: 1 })).toBe(false)
    expect(hasNoVisits({ ...base, visitsGenerated: 1 })).toBe(false)
    expect(outcomeWarning({ ...base, visitsGenerated: 1 })).toBeNull()
    expect(outcomeWarning({ ...base, nextVisitDate: '2026-11-13' })).toContain('generated on Fri 13 Nov 2026')
    expect(outcomeWarning({ ...base, nextVisitDate: '2026-11-13T00:00:00.000Z' })).toContain('Fri 13 Nov 2026')
    expect(outcomeWarning(base)).toContain('none are due to be generated')
  })

  it('lists the facts, singular and plural, skipping zeros', () => {
    expect(outcomeLines(base)).toEqual([])
    expect(outcomeLines({ ...base, visitsUpdated: 1, visitsGenerated: 1, overriddenVisits: 1, nextVisitDate: '2026-11-09' })).toEqual([
      '1 upcoming visit now has this technician.',
      '1 new visit was created.',
      'Next visit: Mon 9 Nov 2026.',
      '1 visit you assigned by hand was left as it is.',
    ])
    expect(outcomeLines({ ...base, visitsUpdated: 4, visitsGenerated: 2, overriddenVisits: 3 })).toEqual([
      '4 upcoming visits now have this technician.',
      '2 new visits were created.',
      '3 visits you assigned by hand were left as they are.',
    ])
  })

  it('summarises a batch for a toast', () => {
    expect(outcomesToastDescription([])).toBeUndefined()
    expect(outcomesToastDescription([{ ...base, nextVisitDate: '2026-11-13' }])).toContain('Fri 13 Nov 2026')
    expect(outcomesToastDescription([base, { ...base, roundId: 'r2' }])).toBe(
      '2 rounds have no visits yet, so nothing shows in the technicians’ apps for them.',
    )
    expect(
      outcomesToastDescription([
        { ...base, visitsUpdated: 2, visitsGenerated: 1 },
        { ...base, roundId: 'r2', visitsUpdated: 3 },
      ]),
    ).toBe('5 visits updated, 1 created.')
  })

  it('renders nothing for no outcomes', () => {
    const { container } = render(<AssignmentResultSummary outcomes={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
