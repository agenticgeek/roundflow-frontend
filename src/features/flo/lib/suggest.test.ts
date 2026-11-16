import { describe, expect, it } from 'vitest'
import { matchSuggestions } from '@/features/flo/lib/suggest'

const POOL = [
  'What is on today and who is behind?',
  'Compare my technicians for last month',
  'Who owes me more than £50 and for how long?',
  'Show open complaints by severity, oldest first',
]

describe('matchSuggestions', () => {
  it('returns nothing for a short or empty query', () => {
    expect(matchSuggestions(POOL, '')).toEqual([])
    expect(matchSuggestions(POOL, 'w')).toEqual([])
  })
  it('matches word starts, in any order', () => {
    expect(matchSuggestions(POOL, 'tech comp')).toEqual(['Compare my technicians for last month'])
    expect(matchSuggestions(POOL, 'owes')).toEqual(['Who owes me more than £50 and for how long?'])
  })
  it('ranks questions that start with the typed word first and caps the list', () => {
    expect(matchSuggestions(POOL, 'who')[0]).toBe('Who owes me more than £50 and for how long?')
    expect(matchSuggestions(POOL, 'who', 1)).toHaveLength(1)
  })
  it('skips an exact repeat of what is already typed and duplicates', () => {
    expect(matchSuggestions([...POOL, POOL[0]], 'What is on today and who is behind?')).toEqual([])
    expect(matchSuggestions([...POOL, POOL[1]], 'compare')).toHaveLength(1)
  })
})
