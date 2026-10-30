import { assignTechniciansContent } from '@/content/round-planner'
import { errorMessage } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

/**
 * The message to show when some `PUT /rounds/:id/technicians` calls failed (GAP-011): the
 * server's own `error` (e.g. "Cannot assign technician(s) with a pending invite: Sam"), with the
 * failing rounds named. `null` when everything saved.
 */
export function assignFailureMessage(
  results: readonly PromiseSettledResult<unknown>[],
  roundNames: readonly string[],
): string | null {
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' ? [{ round: roundNames[index] ?? '', error: errorMessage(result.reason) }] : [],
  )
  if (failed.length === 0) return null
  const errors = [...new Set(failed.map((item) => item.error))]
  return fillCopy(assignTechniciansContent.saveFailed, {
    rounds: failed.map((item) => item.round).join(', '),
    error: errors.join(' · '),
  })
}

/** Technicians who can't be assigned yet — they haven't accepted their invite. */
export function isPendingInvite(technician: { appStatus?: string | null }): boolean {
  return technician.appStatus === 'PENDING_INVITE' || technician.appStatus === 'pending'
}
