/** Round id → its cleaning frequency, for rounds that have one (CSV import, GAP-009). */
export function roundFrequencyMap(
  rounds: readonly { id?: string | null; frequency?: string | null }[] | undefined,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const round of rounds ?? []) {
    if (round.id && round.frequency) map[round.id] = round.frequency
  }
  return map
}
