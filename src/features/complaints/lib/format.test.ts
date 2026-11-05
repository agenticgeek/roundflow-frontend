import { describe, expect, it } from 'vitest'
import {
  resolvedByLabel,
  technicianListHint,
  technicianOptionLabel,
  upheldLabel,
} from '@/features/complaints/lib/format'

describe('resolvedByLabel', () => {
  it('shows the resolver by name, a nameless one as Admin', () => {
    expect(resolvedByLabel({ id: 'p1', name: 'Jo Coates' })).toBe('Jo Coates')
    expect(resolvedByLabel({ id: 'p1', name: ' ' })).toBe('Admin')
    expect(resolvedByLabel({ id: 'p1', name: null })).toBe('Admin')
    expect(resolvedByLabel({ id: 'p1' })).toBe('Admin')
    expect(resolvedByLabel(null)).toBe('—')
    expect(resolvedByLabel(undefined)).toBe('—')
  })
})

describe('upheldLabel', () => {
  it('describes the outcome', () => {
    expect(upheldLabel(true)).toBe('Yes — counts as a strike')
    expect(upheldLabel(false)).toBe('No')
    expect(upheldLabel(null)).toBe('—')
    expect(upheldLabel(undefined)).toBe('—')
  })
})

describe('technician picker helpers (GAP-029 part 2)', () => {
  it('only hints when the team is empty', () => {
    expect(technicianListHint(undefined)).toBeNull()
    expect(technicianListHint([{ appStatus: 'PENDING_INVITE' }])).toBeNull()
    expect(technicianListHint([])).toBe('No technicians yet — add them on the Technicians page.')
  })

  it('flags pending invites in the option label', () => {
    expect(technicianOptionLabel({ name: 'Sam', appStatus: 'ACTIVE' })).toBe('Sam')
    expect(technicianOptionLabel({ name: 'Alex', appStatus: 'PENDING_INVITE' })).toBe('Alex (invite pending)')
    expect(technicianOptionLabel({ name: null })).toBe('Unnamed technician')
  })
})
