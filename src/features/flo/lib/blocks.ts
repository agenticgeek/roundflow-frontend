import type { FloBlock, FloCardsBlock, FloChartBlock, FloTableBlock } from '@/api/flo.api'

export function isCardsBlock(block: FloBlock): block is FloCardsBlock {
  return block.type === 'cards' && Array.isArray((block as FloCardsBlock).items)
}

export function isTableBlock(block: FloBlock): block is FloTableBlock {
  const table = block as FloTableBlock
  return block.type === 'table' && Array.isArray(table.columns) && Array.isArray(table.rows)
}

export function isChartBlock(block: FloBlock): block is FloChartBlock {
  const chart = block as FloChartBlock
  return (
    block.type === 'chart' &&
    (chart.kind === 'bar' || chart.kind === 'line') &&
    Array.isArray(chart.rows) &&
    Array.isArray(chart.series) &&
    typeof chart.x === 'object' &&
    chart.x !== null
  )
}
