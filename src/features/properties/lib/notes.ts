import type { PinnedNote, PropertyNotesListItem } from '@/api/properties.api'
import type { PropertyNoteCategory, PropertyNoteRecord } from '@/content/property-detail'
import { NO_ACCESS_NOTES, NO_RISK_NOTES } from '@/content/property-detail'
import { formatDate } from '@/features/customers/lib/mappers'

export type PinnedEntry = Pick<PinnedNote, 'source' | 'body'>

function isPinned(item: PropertyNotesListItem): item is PinnedNote {
  return item.pinned === true
}

function categoryOf(type: string | undefined): PropertyNoteCategory {
  if (type === 'RISK_WARNING') return 'risk'
  if (type === 'CUSTOMER') return 'customer'
  return 'internal'
}

/**
 * GET /properties/:id/notes (GAP-022 part 2): the server lists the property's access / risk
 * notes first as pinned entries, then the notes. Split them for the Notes & Risk tab.
 */
export function splitPropertyNotes(items: readonly PropertyNotesListItem[]): {
  pinned: PinnedEntry[]
  notes: PropertyNoteRecord[]
} {
  const pinned: PinnedEntry[] = []
  const notes: PropertyNoteRecord[] = []
  items.forEach((item, index) => {
    if (isPinned(item)) {
      pinned.push({ source: item.source, body: item.body })
      return
    }
    notes.push({
      id: item.id ?? `note-${index}`,
      category: categoryOf(item.type),
      body: item.body ?? '',
      author: item.authorName ?? 'Unknown',
      addedOn: formatDate(item.createdAt),
    })
  })
  return { pinned, notes }
}

/** Until the notes load: the same pinned entries built from the property record. */
export function pinnedFromProperty(accessNotes: string, riskNotes: string): PinnedEntry[] {
  return [
    { source: 'ACCESS' as const, body: accessNotes, empty: NO_ACCESS_NOTES },
    { source: 'RISK' as const, body: riskNotes, empty: NO_RISK_NOTES },
  ]
    .filter((entry) => entry.body.trim() && entry.body !== entry.empty)
    .map(({ source, body }) => ({ source, body }))
}
