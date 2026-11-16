import { describe, expect, it } from 'vitest'
import { closuresContent } from '@/content/closures'

describe('closuresContent', () => {
  it('has the plain-English explanations the contract fixes', () => {
    expect(closuresContent.form.mode.move.description).toBe(
      'Visits due during the closure move to the first open day for their round. The regular schedule carries on afterwards.',
    )
    expect(closuresContent.form.mode.skip.description).toBe(
      'Visits due during the closure are skipped for that cycle. The next visit is the next regular one after it.',
    )
    expect(closuresContent.form.mode.moveNote).toContain('one visit after it, not one for each missed cycle')
    expect(closuresContent.delete.body).toContain('does not restore visits that were already moved or skipped')
  })

  it('maps every closure error code and keeps the placeholders the UI fills in', () => {
    for (const code of ['VALIDATION_FAILED', 'INVALID_CLOSURE_RANGE', 'UNKNOWN_ROUND', 'CLOSURE_NOT_FOUND', 'CLOSURE_ENDED']) {
      expect(closuresContent.errors[code]).toBeTruthy()
    }
    expect(closuresContent.warning.text).toBe('This date is inside {label}: {start} to {end}.')
    expect(closuresContent.preview.group).toBe('{count} visits: {from} -> {to}')
    expect(closuresContent.preview.reasons.TECHNICIAN_INACTIVE).toBeTruthy()
    expect(closuresContent.preview.reasons.TECHNICIAN_UNAVAILABLE).toBeTruthy()
    expect(closuresContent.row.allRounds).toBe('All rounds')
    expect(closuresContent.row.notApplied).toBe('Not applied to existing visits')
  })
})
