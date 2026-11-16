/**
 * Type-ahead for the question box: which suggested questions match what the admin has typed so far.
 * Every word typed must start a word in the suggestion (so "tech comp" finds "Compare my technicians").
 * Pure and client-side: the questions themselves come from the server's suggestion list.
 */
export const MIN_QUERY_CHARS = 2

const words = (s: string): string[] => s.toLowerCase().match(/[\p{L}\p{N}£]+/gu) ?? []

export function matchSuggestions(pool: readonly string[], typed: string, limit = 4): string[] {
  const query = words(typed)
  if (typed.trim().length < MIN_QUERY_CHARS || query.length === 0) return []
  const seen = new Set<string>()
  const hits: Array<{ text: string; score: number }> = []
  for (const text of pool) {
    const key = text.toLowerCase()
    if (seen.has(key) || key === typed.trim().toLowerCase()) continue
    seen.add(key)
    const target = words(text)
    if (!query.every((q) => target.some((t) => t.startsWith(q)))) continue
    // Earlier matches rank higher: typing the start of a question beats matching a word at its end.
    hits.push({ text, score: target.findIndex((t) => t.startsWith(query[0])) })
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.text)
}
