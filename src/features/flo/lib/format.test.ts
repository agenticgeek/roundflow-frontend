import { describe, expect, it } from 'vitest'
import { formatFloValue, statusLine } from '@/features/flo/lib/format'

describe('formatFloValue', () => {
  it('formats each declared format', () => {
    expect(formatFloValue(5460, 'currency')).toBe('£5,460.00')
    expect(formatFloValue(-12.5, 'currency')).toBe('-£12.50')
    expect(formatFloValue(1234567, 'integer')).toBe('1,234,567')
    expect(formatFloValue(781.4, 'integer')).toBe('781')
    expect(formatFloValue(96.44, 'percent')).toBe('96.4%')
    expect(formatFloValue('2026-10-29', 'date')).toBe('29 Oct 2026')
    expect(formatFloValue('James', 'text')).toBe('James')
    expect(formatFloValue(7)).toBe('7')
  })

  it('shows a dash for an empty value and the raw text when a value does not fit its format', () => {
    expect(formatFloValue(null, 'text')).toBe('–')
    expect(formatFloValue(undefined, 'integer')).toBe('–')
    expect(formatFloValue('', 'text')).toBe('–')
    expect(formatFloValue('soon', 'date')).toBe('soon')
    expect(formatFloValue('many', 'integer')).toBe('many')
    expect(formatFloValue(Number.NaN, 'currency')).toBe('NaN')
  })
})

describe('statusLine', () => {
  it('describes what is being checked, then what was checked', () => {
    expect(statusLine([])).toBe('')
    expect(
      statusLine([
        { tool: 'a', label: 'Debt', done: false },
        { tool: 'b', label: 'Payments', done: false },
        { tool: 'c', label: 'X', done: true },
      ]),
    ).toBe('Checking: Debt, Payments')
    expect(statusLine([{ tool: 'a', label: 'Debt', done: true }])).toBe('Checked 1 data source')
    expect(
      statusLine([
        { tool: 'a', label: 'Debt', done: true },
        { tool: 'b', label: 'P', done: true },
      ]),
    ).toBe('Checked 2 data sources')
  })
})
