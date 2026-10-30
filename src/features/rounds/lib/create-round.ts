/**
 * Creates a round, then assigns its technician — and if the assignment fails (e.g. the
 * technician's invite is still pending, which the API rejects with 400), undoes the create so
 * no half-made round is left behind (GAP-011). The assignment error is re-thrown for the UI.
 *
 * There is no `DELETE /rounds/:id`; `rollback` archives the round instead.
 */
export async function createRoundThenAssign<R extends { id?: string }>({
  create,
  assign,
  rollback,
}: {
  create: () => Promise<R>
  /** Omit when no technician was picked. */
  assign?: (roundId: string) => Promise<unknown>
  rollback: (roundId: string) => Promise<unknown>
}): Promise<R> {
  const round = await create()
  if (!assign || !round.id) return round
  try {
    await assign(round.id)
  } catch (error) {
    // Best effort — the assignment error is what the user needs to see.
    await rollback(round.id).catch(() => undefined)
    throw error
  }
  return round
}
