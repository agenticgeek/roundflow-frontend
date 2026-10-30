import type { PhotoRow } from '@/api/photos.api'

export type PhotoGroup = {
  /** visitId, or `property` for photos not taken on a visit. */
  key: string
  visitId: string | null
  visitDate: string | null
  technicianName: string | null
  before: PhotoRow[]
  after: PhotoRow[]
  other: PhotoRow[]
}

/**
 * Groups a page of photos into one card per visit with its before / after pair(s); photos
 * not taken on a visit (PROPERTY) form their own group. Keeps the server's order.
 */
export function groupPhotosByVisit(rows: readonly PhotoRow[]): PhotoGroup[] {
  const groups = new Map<string, PhotoGroup>()
  for (const row of rows) {
    const key = row.visitId ?? 'property'
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        visitId: row.visitId,
        visitDate: row.visitDate,
        technicianName: row.technician?.name ?? null,
        before: [],
        after: [],
        other: [],
      }
      groups.set(key, group)
    }
    if (!group.technicianName && row.technician?.name) group.technicianName = row.technician.name
    if (row.type === 'BEFORE') group.before.push(row)
    else if (row.type === 'AFTER') group.after.push(row)
    else group.other.push(row)
  }
  return [...groups.values()]
}

/** A group's photos in display order (before, after, other) — the lightbox steps through these. */
export function groupPhotosInOrder(group: PhotoGroup): PhotoRow[] {
  return [...group.before, ...group.after, ...group.other]
}
