import { describe, expect, it } from 'vitest'
import { isCardsBlock, isChartBlock, isTableBlock } from '@/features/flo/lib/blocks'

describe('block guards', () => {
  it('accept well-formed blocks only', () => {
    expect(isCardsBlock({ type: 'cards', items: [] } as never)).toBe(true)
    expect(isCardsBlock({ type: 'cards' })).toBe(false)
    expect(isCardsBlock({ type: 'table' })).toBe(false)
    expect(isTableBlock({ type: 'table', columns: [], rows: [] } as never)).toBe(true)
    expect(isTableBlock({ type: 'table', columns: [] })).toBe(false)
    expect(isTableBlock({ type: 'chart' })).toBe(false)
  })

  it('accept a well-formed chart and reject unknown kinds or missing parts', () => {
    const chart = { type: 'chart', kind: 'bar', title: 'T', x: { key: 'a', label: 'A', format: 'text' }, series: [], rows: [] }
    expect(isChartBlock(chart as never)).toBe(true)
    expect(isChartBlock({ ...chart, kind: 'pie' } as never)).toBe(false)
    expect(isChartBlock({ ...chart, rows: undefined } as never)).toBe(false)
    expect(isChartBlock({ ...chart, series: undefined } as never)).toBe(false)
    expect(isChartBlock({ ...chart, x: null } as never)).toBe(false)
    expect(isChartBlock({ type: 'table' })).toBe(false)
  })
})
