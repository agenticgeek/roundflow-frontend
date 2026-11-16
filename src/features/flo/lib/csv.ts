import type { FloCell, FloTableBlock } from '@/api/flo.api'
import { floContent } from '@/content/flo'

const BOM = '﻿'
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * One CSV field. Numbers stay plain (so "-5" in a currency column is still a number in Excel), text that
 * could start a spreadsheet formula gets a leading single quote, and anything with a comma, quote or
 * line break is quoted with doubled quotes.
 */
export function csvField(cell: FloCell | undefined): string {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : ''
  const safe = FORMULA_START.test(cell) ? `'${cell}` : cell
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** The table as CSV text: header labels, every row, then the totals row when there is one. UTF-8 BOM first. */
export function tableToCsv(block: Pick<FloTableBlock, 'columns' | 'rows' | 'totals'>): string {
  const line = (read: (key: string) => FloCell | undefined) => block.columns.map((column) => csvField(read(column.key))).join(',')
  const lines = [
    block.columns.map((column) => csvField(column.label)).join(','),
    ...block.rows.map((row) => line((key) => row[key])),
    ...(block.totals ? [line((key) => block.totals?.[key])] : []),
  ]
  return `${BOM}${lines.join('\r\n')}\r\n`
}

/** `title-YYYY-MM-DD.csv`: lower-case, letters and digits only. */
export function csvFilename(title: string | undefined, now: Date = new Date()): string {
  const slug = (title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${slug || floContent.table.exportFallbackName}-${day}.csv`
}

/** Hands the table to the browser as a file download (Blob + temporary anchor). */
export function downloadTableCsv(block: Pick<FloTableBlock, 'title' | 'columns' | 'rows' | 'totals'>): void {
  const url = URL.createObjectURL(new Blob([tableToCsv(block)], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = csvFilename(block.title)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
