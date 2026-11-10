import { describe, expect, it } from 'vitest'
import { isCardsBlock, isTableBlock } from '@/features/flo/lib/blocks'

describe('block guards', () => {
  it('accept well-formed blocks only', () => {
    expect(isCardsBlock({ type: 'cards', items: [] } as never)).toBe(true)
    expect(isCardsBlock({ type: 'cards' })).toBe(false)
    expect(isCardsBlock({ type: 'table' })).toBe(false)
    expect(isTableBlock({ type: 'table', columns: [], rows: [] } as never)).toBe(true)
    expect(isTableBlock({ type: 'table', columns: [] })).toBe(false)
    expect(isTableBlock({ type: 'chart' })).toBe(false)
  })
})
