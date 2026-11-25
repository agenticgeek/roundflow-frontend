import { api } from '@/api/client'
import { confirmDialogContent } from '@/content/confirm-dialog'
import { ApiError } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

// CONTRACT-DIFF: GET /rounds/:id/delete-preview and DELETE /rounds/:id are new and not in
// src/api/types.gen.ts yet. These hand-written types go once the API types are regenerated.

/** GET /rounds/:id/delete-preview — what deleting the round would do, and whether it may. */
export type RoundDeletePreview = {
  /** Properties that lose their round (their plans stay active). */
  propertyCount: number
  /** Scheduled / skipped visits dated today or later — deleted. */
  upcomingVisitCount: number
  /** Older unfinished visits — kept as history with no round. */
  detachedVisitCount: number
  /** Emergency reports on the round; any blocks the delete. */
  emergencyCount: number
  /** Upcoming visits with an invoice, payment, photo or issue; any blocks the delete. */
  attachedVisitCount: number
  canDelete: boolean
}

/** DELETE /rounds/:id success body. */
export type RoundDeleteResult = {
  deleted: true
  unassignedProperties: number
  deletedVisits: number
  detachedVisits: number
}

/** 409 codes DELETE /rounds/:id answers with when the round can't go. */
export const ROUND_DELETE_CONFLICT = {
  emergencies: 'ROUND_HAS_EMERGENCIES',
  attachedVisits: 'ROUND_HAS_ATTACHED_VISITS',
} as const

export const roundDeleteApi = {
  preview: (id: string, signal?: AbortSignal) =>
    api<RoundDeletePreview>(`/rounds/${encodeURIComponent(id)}/delete-preview`, { signal }),
  remove: (id: string) => api<RoundDeleteResult>(`/rounds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

const copy = confirmDialogContent.round

function counted(count: number, one: string, many: string) {
  return count === 1 ? one : fillCopy(many, { count })
}

export function propertiesLabel(count: number) {
  return counted(count, copy.propertyOne, copy.propertyMany)
}

export function upcomingVisitsLabel(count: number) {
  return counted(count, copy.visitOne, copy.visitMany)
}

/** "X properties will be unassigned and Y upcoming visits removed. Completed visits are kept." */
export function deleteSummary(preview: Pick<RoundDeletePreview, 'propertyCount' | 'upcomingVisitCount'>) {
  return fillCopy(copy.description, {
    properties: propertiesLabel(preview.propertyCount),
    visits: upcomingVisitsLabel(preview.upcomingVisitCount),
  })
}

/** Older unfinished visits kept as history, or null when there are none. */
export function detachedNote(count: number) {
  return count > 0 ? counted(count, copy.detachedOne, copy.detachedMany) : null
}

/** Why the round can't be deleted — empty when it can. */
export function blockedReasons(preview: RoundDeletePreview): string[] {
  if (preview.canDelete) return []
  const reasons: string[] = []
  if (preview.emergencyCount > 0) reasons.push(counted(preview.emergencyCount, copy.emergenciesOne, copy.emergenciesMany))
  if (preview.attachedVisitCount > 0) reasons.push(counted(preview.attachedVisitCount, copy.attachedOne, copy.attachedMany))
  return reasons.length > 0 ? reasons : [copy.blockedUnknown]
}

/** Copy for a 409 the delete hit after the preview said it was fine (something changed meanwhile). */
export function deleteConflictMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  if (error.code === ROUND_DELETE_CONFLICT.emergencies) return copy.conflictEmergencies
  if (error.code === ROUND_DELETE_CONFLICT.attachedVisits) return copy.conflictAttached
  return null
}

export function isRoundGone(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
