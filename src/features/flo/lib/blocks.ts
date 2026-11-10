import type { FloBlock, FloCardsBlock, FloTableBlock } from '@/api/flo.api'

export function isCardsBlock(block: FloBlock): block is FloCardsBlock {
  return block.type === 'cards' && Array.isArray((block as FloCardsBlock).items)
}

export function isTableBlock(block: FloBlock): block is FloTableBlock {
  const table = block as FloTableBlock
  return block.type === 'table' && Array.isArray(table.columns) && Array.isArray(table.rows)
}
