import { describe, expect, it } from 'vitest'
import { roundFrequencyMap } from '@/lib/round-frequency'

describe('roundFrequencyMap', () => {
  it('maps round ids to frequencies, skipping rounds without either', () => {
    expect(
      roundFrequencyMap([
        { id: 'r1', frequency: 'SIX_WEEKLY' },
        { id: 'r2', frequency: null },
        { id: null, frequency: 'FOUR_WEEKLY' },
      ]),
    ).toEqual({ r1: 'SIX_WEEKLY' })
    expect(roundFrequencyMap(undefined)).toEqual({})
  })
})
