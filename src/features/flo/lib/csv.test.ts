import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FloTableBlock } from '@/api/flo.api'
import { csvField, csvFilename, downloadTableCsv, tableToCsv } from '@/features/flo/lib/csv'

const block: FloTableBlock = {
  type: 'table',
  title: 'Debt by customer',
  columns: [
    { key: 'name', label: 'Customer', format: 'text', align: 'left' },
    { key: 'owed', label: 'Owed, £', format: 'currency', align: 'right' },
  ],
  rows: [
    { name: 'Smith, "Bob"', owed: 12.5 },
    { name: '=HYPERLINK("x")', owed: -3 },
    { name: 'Line\nbreak', owed: null },
  ],
  totals: { name: 'Total', owed: 9.5 },
}

afterEach(() => vi.restoreAllMocks())

describe('csv', () => {
  it('escapes fields, guards formulas and keeps numbers plain', () => {
    expect(csvField(null)).toBe('')
    expect(csvField(undefined)).toBe('')
    expect(csvField(Number.NaN)).toBe('')
    expect(csvField(-3)).toBe('-3')
    expect(csvField('plain')).toBe('plain')
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    for (const lead of ['=1', '+1', '-1', '@a']) expect(csvField(lead)).toBe(`'${lead}`)
  })

  it('writes a BOM, header, rows and the totals row', () => {
    const csv = tableToCsv(block)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Customer,"Owed, £"',
      '"Smith, ""Bob""",12.5',
      `"'=HYPERLINK(""x"")",-3`,
      '"Line\nbreak",',
      'Total,9.5',
      '',
    ])
    expect(tableToCsv({ ...block, totals: undefined }).split('\r\n')).toHaveLength(5)
  })

  it('names the file from the title and the local date', () => {
    const day = new Date(2026, 10, 3)
    expect(csvFilename('Debt by customer!', day)).toBe('debt-by-customer-2026-11-03.csv')
    expect(csvFilename(undefined, day)).toBe('flo-results-2026-11-03.csv')
    expect(csvFilename('£££', day)).toBe('flo-results-2026-11-03.csv')
    expect(csvFilename('x')).toMatch(/^x-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('downloads through a Blob and a temporary anchor', async () => {
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadTableCsv(block)
    const blob = (create.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(blob.size).toBeGreaterThan(20)
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
