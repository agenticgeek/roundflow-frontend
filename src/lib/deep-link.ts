/** Query parameters that point Today's Work and the Round Planner at one visit, round or day. */
export type DeepLink = { visitId?: string; round?: string; date?: string }

const ID = /^[A-Za-z0-9_-]{1,64}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Keeps only well-formed values, so a hand-edited URL cannot inject anything. */
export function readDeepLink(params: URLSearchParams): DeepLink {
  const visitId = params.get('visitId') ?? ''
  const round = params.get('round') ?? ''
  const date = params.get('date') ?? ''
  return {
    ...(ID.test(visitId) ? { visitId } : {}),
    ...(ID.test(round) ? { round } : {}),
    ...(ISO_DATE.test(date) ? { date } : {}),
  }
}

/** `/todays-work` + `{ round: 'r1' }` → `/todays-work?round=r1`; no values → the bare path. */
export function buildDeepLink(path: string, link: DeepLink): string {
  const params = new URLSearchParams()
  if (link.visitId) params.set('visitId', link.visitId)
  if (link.round) params.set('round', link.round)
  if (link.date) params.set('date', link.date)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}
