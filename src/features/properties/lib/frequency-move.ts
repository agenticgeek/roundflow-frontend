import type { components } from '@/api/types.gen'
import { propertyDetailContent } from '@/content/property-detail'
import { FREQUENCY_LABELS } from '@/features/customers/lib/mappers'
import { ApiError } from '@/lib/errors'

type NoMatchingRoundBody = components['schemas']['NoMatchingRoundError']
type MovedToRound = components['schemas']['MovedToRound']

export type RoundSuggestion = { id: string; name: string; frequencyLabel: string | null }

/** A 409 NO_MATCHING_ROUND from a frequency change (B3 · GAP-018), ready for the prompt. */
export type NoMatchingRound = {
  message: string
  proposedName: string
  suggestions: RoundSuggestion[]
}

/** The 409 NO_MATCHING_ROUND body, or null for any other error. */
export function parseNoMatchingRound(error: unknown): NoMatchingRound | null {
  if (!(error instanceof ApiError) || error.code !== 'NO_MATCHING_ROUND') return null
  const body = (error.body ?? {}) as Partial<NoMatchingRoundBody>
  const suggestions = (body.suggestions ?? []).flatMap((round) =>
    round.id && round.name
      ? [{ id: round.id, name: round.name, frequencyLabel: round.frequency ? FREQUENCY_LABELS[round.frequency] : null }]
      : [],
  )
  return { message: error.message, proposedName: body.proposedName ?? '', suggestions }
}

/** "Moved to <round>" toast for a successful change, or the plain success copy when nothing moved. */
export function movedToRoundMessage(moved: MovedToRound | undefined): string {
  const copy = propertyDetailContent.changeFrequencyModal
  if (!moved) return copy.successToast
  return (moved.created ? copy.createdToast : copy.movedToast).replace('{round}', moved.name)
}
